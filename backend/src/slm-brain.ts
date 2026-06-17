import type { Config } from "./config.js";
import { logger } from "./logger.js";
import type { BrainLike, TurnHooks, TurnResult } from "./brain.js";
import type { Intent } from "./intent.js";
import {
  chatInstructions,
  codeInstructions,
  netLocalInstructions,
  netSearchInstructions,
  slmGeneralTopicsInstructions,
} from "./persona.js";
import { personaForSkin, type AgentSkinId } from "./agent-skins.js";
import { assistantLabel, chatInstructionsForSkin, fewShotForSkin } from "./skin-replies.js";
import { normalizeTarsTraits, slmTemperatureForTars, tarsTraitsPrompt, type TarsTraits } from "./tars-traits.js";
import { slmPolishInstructions } from "./polish-language.js";
import { polishForSpeech } from "./spoken-polish.js";
import { deviceFactsBlock, splitTranscriptAndContext } from "./transcript-context.js";

const log = logger("slm");

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const LOCAL_SLM_ID = "local-ollama";

/**
 * Local small-language-model brain via Ollama on this Mac (127.0.0.1 only).
 * No cloud LLM, no internet — inference runs entirely on your machine.
 */
export class SlmBrain implements BrainLike {
  private readonly history: ChatMessage[] = [];
  private available = false;

  constructor(private readonly cfg: Config) {}

  get agentId(): string | undefined {
    return LOCAL_SLM_ID;
  }

  async checkAvailable(): Promise<void> {
    assertLocalOllamaUrl(this.cfg.ollamaBaseUrl);
    const url = `${this.cfg.ollamaBaseUrl}/api/tags`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(3_000) });
    if (!resp.ok) {
      throw new Error(`Ollama not reachable at ${this.cfg.ollamaBaseUrl} (${resp.status})`);
    }
    const body = (await resp.json()) as { models?: Array<{ name: string }> };
    const names = (body.models ?? []).map((m) => m.name);
    const wanted = this.cfg.ollamaModel;
    const hasModel = names.some((n) => n === wanted || n.startsWith(`${wanted}:`));
    if (!hasModel) {
      throw new Error(
        `Ollama model "${wanted}" not found. Run: ollama pull ${wanted}`,
      );
    }
    this.available = true;
    log.info(`local SLM ready model=${wanted} url=${this.cfg.ollamaBaseUrl}`);
  }

  async prepare(): Promise<void> {
    await this.checkAvailable();
  }

  async handleTurn(transcript: string, intent: Intent, hooks: TurnHooks = {}): Promise<TurnResult> {
    if (!this.available) {
      await this.checkAvailable();
    }

    const skin = hooks.skin ?? "hal9000";
    const traits = normalizeTarsTraits(hooks.tarsTraits);
    const { userText, deviceFacts } = splitTranscriptAndContext(transcript.trim());
    this.history.push({ role: "user", content: userText || transcript.trim() });
    this.trimHistory();

    hooks.onAssistantText?.("…");

    const persona = personaForSkin(skin);
    const polishBlock = `\n\n${slmPolishInstructions(skin)}`;
    const tarsBlock = skin === "tars" ? `\n\n${tarsTraitsPrompt(traits)}` : "";
    const memoryBlock = hooks.memoryBlock?.trim() ? `\n\n${hooks.memoryBlock.trim()}` : "";
    const templatesBlock = hooks.templatesBlock?.trim() ? `\n\n${hooks.templatesBlock.trim()}` : "";
    const temperature = skin === "tars" ? slmTemperatureForTars(traits, 0.48) : 0.48;
    const modeInstructions = modeForIntent(intent, skin, hooks.memoryBlock, traits);
    const generalTopics =
      intent === "chat" || intent === "net" ? `\n\n${slmGeneralTopicsInstructions()}` : "";
    const resp = await fetch(`${this.cfg.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(this.cfg.slmTimeoutMs),
      body: JSON.stringify({
        model: this.cfg.ollamaModel,
        messages: [
          {
            role: "system",
            content: `${persona}${polishBlock}\n\n${modeInstructions}${generalTopics}\n\n${deviceFactsBlock(deviceFacts)}${tarsBlock}${templatesBlock}${memoryBlock}\n\n${fewShotForSkin(skin, skin === "tars" ? traits : undefined)}`,
          },
          ...this.history,
        ],
        stream: false,
        options: {
          temperature,
          top_p: 0.9,
          num_predict: Math.max(this.cfg.slmMaxTokens, 160),
          stop: ["Użytkownik:", "User:", "\nU:", `\n${assistantLabel(skin)}:`],
        },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Ollama chat failed (${resp.status}): ${body.slice(0, 200)}`);
    }

    const data = (await resp.json()) as { message?: { content?: string } };
    const raw = (data.message?.content ?? "").trim() ||
      "Słyszę cię, ale mój lokalny mózg zwrócił pustkę. Typowe.";
    const spoken = polishForSpeech(raw);

    this.history.push({ role: "assistant", content: spoken });
    this.trimHistory();
    hooks.onAssistantText?.(spoken);

    log.info(`local SLM reply intent=${intent} chars=${spoken.length} text="${spoken.slice(0, 120)}${spoken.length > 120 ? "…" : ""}"`);
    return { spoken, runId: `slm-${Date.now()}` };
  }

  async dispose(): Promise<void> {}

  resetChatContext(): void {
    this.clearHistory();
  }

  /** Drop SLM context when the user switches agent skin on the R1. */
  clearHistory(): void {
    this.history.length = 0;
  }

  private trimHistory(): void {
    const max = this.cfg.slmHistoryTurns * 2;
    while (this.history.length > max) this.history.shift();
  }
}

function modeForIntent(intent: Intent, skin: AgentSkinId, memoryBlock?: string, traits?: TarsTraits): string {
  switch (intent) {
    case "code":
      return `${codeInstructions()}\nTryb lokalny SLM — bez edycji plików. Powiedz użytkownikowi, żeby poprosił o kod, GitHub lub UiPath (wtedy włączy się agent chmurowy w BRAIN_MODE=hybrid).`;
    case "net":
      return memoryBlock?.includes("WYNIKI WYSZUKIWANIA INTERNETU")
        ? `${netSearchInstructions()}\nBez chmury — odpowiedz z wyników wyszukiwania w kontekście.`
        : `${netLocalInstructions()}\nSpróbuj odpowiedzieć z pamięci kontekstowej; jeśli brak danych — powiedz wprost.`;
    default:
      return chatInstructionsForSkin(skin, traits);
  }
}

/** SLM must stay on this machine — never a remote/cloud Ollama endpoint. */
export function assertLocalOllamaUrl(baseUrl: string): void {
  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`Invalid OLLAMA_BASE_URL: ${baseUrl}`);
  }
  const local = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);
  if (!local.has(host)) {
    throw new Error(
      `OLLAMA_BASE_URL must be local (${baseUrl}). SLM does not use cloud inference.`,
    );
  }
}
