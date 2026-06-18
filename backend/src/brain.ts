import { Agent, CursorAgentError, type Run, type SDKAgent, type SDKCustomTool } from "@cursor/sdk";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import type { Intent } from "./intent.js";
import type { ConversationLang } from "./conversation-lang.js";
import type { SkillRegistry } from "./skills.js";
import {
  buildPrompt,
  chatInstructions,
  codeInstructions,
  netInstructions,
} from "./persona.js";
import { personaForSkin, type AgentSkinId } from "./agent-skins.js";
import { slmPolishInstructions } from "./polish-language.js";
import { slmEnglishInstructions } from "./english-language.js";
import { chatInstructionsForSkin, codeInstructionsForSkin } from "./skin-replies.js";
import { normalizeTarsTraits, tarsTraitsPrompt } from "./tars-traits.js";
import type { StandardsRegistry } from "./standards.js";

const log = logger("brain");

export interface TurnHooks {
  /** Called as the agent emits assistant text (for live status / partial TTS). */
  onAssistantText?: (text: string) => void;
  /** Called when the agent starts using tools (i.e. real repo work). */
  onWorking?: () => void;
  /** When true, the active cloud run should be cancelled. */
  isCancelled?: () => boolean;
  /** R1 settings skin — changes spoken persona. */
  skin?: AgentSkinId;
  /** TARS honesty / humor / sarcasm sliders (0–100). */
  tarsTraits?: import("./tars-traits.js").TarsTraits;
  /** Persistent user/device memory block (facts & notes). */
  memoryBlock?: string;
  /** Named doc templates block (separate from memory facts). */
  templatesBlock?: string;
  /** pl | en — from R1 settings. */
  lang?: ConversationLang;
}

export class TurnCancelledError extends Error {
  constructor() {
    super("turn cancelled");
    this.name = "TurnCancelledError";
  }
}

export interface TurnResult {
  /** The short, speakable reply. */
  spoken: string;
  runId: string;
}

/** Common surface for the real Cursor brain and the test echo brain. */
export interface BrainLike {
  readonly agentId: string | undefined;
  /** Validate/create agent before first turn (e.g. after reconnect). */
  prepare(): Promise<void>;
  handleTurn(
    transcript: string,
    intent: Intent,
    hooks?: TurnHooks,
    modeOverride?: string,
  ): Promise<TurnResult>;
  /** Abort the in-flight cloud run, if any. */
  cancelActiveTurn?(): Promise<void>;
  /** Drop local chat history (e.g. after R1 skin change). */
  resetChatContext?(): void;
  dispose(): Promise<void>;
}

/**
 * Wraps a single Cursor SDK agent bound to the target repo. One Brain per R1
 * session; reused across turns so the conversation keeps context. Survives
 * reconnects via `agentId` + `Agent.resume`.
 */
export class Brain implements BrainLike {
  private agent?: SDKAgent;
  private activeRun?: Run;

  constructor(
    private readonly cfg: Config,
    private resumeAgentId?: string,
    private readonly skills?: SkillRegistry,
    private readonly standards?: StandardsRegistry,
  ) {}

  get agentId(): string | undefined {
    return this.agent?.agentId ?? this.resumeAgentId;
  }

  private async ensureAgent(): Promise<SDKAgent> {
    if (this.agent) return this.agent;

    if (this.resumeAgentId) {
      log.info(`resuming agent ${this.resumeAgentId}`);
      try {
        this.agent = await Agent.resume(this.resumeAgentId, { apiKey: this.cfg.cursorApiKey });
        return this.agent;
      } catch (err) {
        const msg = err instanceof CursorAgentError ? err.message : String(err);
        if (/not found/i.test(msg)) {
          log.warn(`agent ${this.resumeAgentId} not found — creating a fresh agent`);
          this.resumeAgentId = undefined;
        } else {
          throw err;
        }
      }
    }

    log.info(`creating agent (model=${this.cfg.cursorModel}, cwd=${this.cfg.repoPath})`);
    this.agent = await Agent.create({
      apiKey: this.cfg.cursorApiKey,
      model: { id: this.cfg.cursorModel },
      name: "GLaDOS R1",
      local: {
        cwd: this.cfg.repoPath,
        // Inline config only — the GLaDOS persona comes from the prompt prefix,
        // so we don't depend on the target repo carrying our rules.
        settingSources: [],
      },
    });
    this.resumeAgentId = this.agent.agentId;
    return this.agent;
  }

  async prepare(): Promise<void> {
    await this.ensureAgent();
  }

  async cancelActiveTurn(): Promise<void> {
    const run = this.activeRun;
    if (!run?.supports("cancel")) return;
    log.info(`cancelling run ${run.id}`);
    await run.cancel().catch((err) => log.warn(`run.cancel failed: ${err}`));
  }

  private cancelled(hooks: TurnHooks): boolean {
    return hooks.isCancelled?.() === true;
  }

  private async abortRun(run: Run): Promise<never> {
    if (run.supports("cancel")) {
      await run.cancel().catch((err) => log.warn(`run.cancel failed: ${err}`));
    }
    await run.wait().catch(() => {});
    throw new TurnCancelledError();
  }

  async handleTurn(
    transcript: string,
    intent: Intent,
    hooks: TurnHooks = {},
    modeOverride?: string,
  ): Promise<TurnResult> {
    const agent = await this.ensureAgent();
    const skin = hooks.skin ?? "hal9000";
    const traits = normalizeTarsTraits(hooks.tarsTraits);
    const instructions =
      modeOverride ??
      (intent === "code" ? codeInstructionsForSkin(skin, skin === "tars" ? traits : undefined) :
        intent === "net" ? netInstructions() :
        chatInstructionsForSkin(skin, skin === "tars" ? traits : undefined));

    const customTools = (await this.skills?.getCustomTools()) ?? {};
    const skillNames = Object.keys(customTools);
    const skillHint =
      skillNames.length > 0
        ? `\n\nAvailable skills (call the matching tool when relevant): ${skillNames.join(", ")}.`
        : "";
    const standardsBlock =
      (intent === "code" || intent === "net") && this.standards
        ? `\n\n${await this.standards.getPromptBlock()}`
        : "";
    const memoryBlock = hooks.memoryBlock?.trim() ? `\n\n${hooks.memoryBlock.trim()}` : "";
    const templatesBlock = hooks.templatesBlock?.trim() ? `\n\n${hooks.templatesBlock.trim()}` : "";
    const tarsBlock = skin === "tars" ? `\n\n${tarsTraitsPrompt(traits)}` : "";
    const persona = personaForSkin(skin);
    const lang = hooks.lang ?? "pl";
    const langBlock =
      lang === "en"
        ? `\n\n${slmEnglishInstructions(skin)}`
        : `\n\n${slmPolishInstructions(skin)}`;
    const prompt =
      buildPrompt(persona + langBlock, instructions, transcript) + skillHint + standardsBlock + templatesBlock + memoryBlock + tarsBlock;

    const run = await this.sendWithRetry(agent, prompt, customTools);
    this.activeRun = run;

    log.info(`run started id=${run.id} agentId=${agent.agentId} intent=${intent}`);

    const assistantParts: string[] = [];
    let toolUseSignalled = false;

    try {
      if (this.cancelled(hooks)) {
        await this.abortRun(run);
      }

      for await (const msg of run.stream()) {
        if (this.cancelled(hooks)) {
          await this.abortRun(run);
        }
        if (msg.type === "assistant") {
          for (const block of msg.message.content) {
            if (block.type === "text" && block.text.trim()) {
              assistantParts.push(block.text);
              hooks.onAssistantText?.(block.text);
            } else if (block.type === "tool_use" && !toolUseSignalled) {
              toolUseSignalled = true;
              hooks.onWorking?.();
            }
          }
        } else if (msg.type === "tool_call" && !toolUseSignalled) {
          toolUseSignalled = true;
          hooks.onWorking?.();
        }
      }

      const result = await run.wait();
      log.info(`run ${run.id} finished status=${result.status} durationMs=${result.durationMs ?? "?"}`);

      if (result.status === "cancelled" || this.cancelled(hooks)) {
        throw new TurnCancelledError();
      }

      if (result.status === "error") {
        throw new Error(`run ${run.id} failed (status=error)`);
      }

      const spoken = (result.result?.trim() || assistantParts.join(" ").trim() ||
        "I completed the task, though I have nothing pithy to say about it.");
      return { spoken, runId: run.id };
    } finally {
      this.activeRun = undefined;
    }
  }

  /**
   * Start a run, retrying only when the SDK marks the startup failure as
   * retryable (transient network/rate-limit). Non-retryable errors (auth,
   * config) propagate immediately.
   */
  private async sendWithRetry(
    agent: SDKAgent,
    prompt: string,
    customTools: Record<string, SDKCustomTool>,
    maxAttempts = 3,
  ): Promise<Run> {
    const sendOpts =
      Object.keys(customTools).length > 0 ? { local: { customTools } } : undefined;
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        return await agent.send(prompt, sendOpts);
      } catch (err) {
        const retryable = err instanceof CursorAgentError && err.isRetryable;
        if (!retryable || attempt >= maxAttempts) {
          if (err instanceof CursorAgentError) {
            log.error(`agent.send failed to start: ${err.message} retryable=${err.isRetryable}`);
          }
          throw err;
        }
        const backoff = 500 * 2 ** (attempt - 1);
        log.warn(`agent.send transient failure (attempt ${attempt}/${maxAttempts}), retrying in ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.agent) {
      await this.agent[Symbol.asyncDispose]().catch(() => {});
      this.agent = undefined;
    }
  }
}
