import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { TurnCancelledError, type BrainLike, type TurnHooks, type TurnResult } from "./brain.js";
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
import { slmEnglishInstructions } from "./english-language.js";
import { prepareForSpeech } from "./spoken-polish.js";
import type { ConversationLang } from "./conversation-lang.js";
import { chatInstructionsForSkinEn, fewShotForSkinEn } from "./skin-replies-en.js";
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
  private activeAbort?: AbortController;

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
    const lang: ConversationLang = hooks.lang ?? "pl";
    const traits = normalizeTarsTraits(hooks.tarsTraits);
    const { userText, deviceFacts } = splitTranscriptAndContext(transcript.trim());
    this.history.push({ role: "user", content: userText || transcript.trim() });
    this.trimHistory();

    hooks.onAssistantText?.("…");
    if (hooks.isCancelled?.()) throw new TurnCancelledError();

    const persona = personaForSkin(skin);
    const langBlock =
      lang === "en"
        ? `\n\n${slmEnglishInstructions(skin)}`
        : `\n\n${slmPolishInstructions(skin)}`;
    const tarsBlock = skin === "tars" ? `\n\n${tarsTraitsPrompt(traits)}` : "";
    const memoryBlock = hooks.memoryBlock?.trim() ? `\n\n${hooks.memoryBlock.trim()}` : "";
    const templatesBlock = hooks.templatesBlock?.trim() ? `\n\n${hooks.templatesBlock.trim()}` : "";
    const temperature = skin === "tars" ? slmTemperatureForTars(traits, 0.48) : 0.48;
    const modeInstructions = modeForIntent(intent, skin, hooks.memoryBlock, traits, lang);
    const generalTopics =
      intent === "chat" || intent === "net" ? `\n\n${slmGeneralTopicsInstructions()}` : "";
    const fewShots =
      lang === "en"
        ? fewShotForSkinEn(skin, skin === "tars" ? traits : undefined)
        : fewShotForSkin(skin, skin === "tars" ? traits : undefined);
    const abort = new AbortController();
    this.activeAbort = abort;
    const timeout = setTimeout(() => abort.abort(), this.cfg.slmTimeoutMs);
    let resp: Response;
    try {
      resp = await fetch(`${this.cfg.ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          model: this.cfg.ollamaModel,
          messages: [
            {
              role: "system",
              content: `${persona}${langBlock}\n\n${modeInstructions}${generalTopics}\n\n${deviceFactsBlock(deviceFacts)}${tarsBlock}${templatesBlock}${memoryBlock}\n\n${fewShots}`,
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
    } catch (err) {
      if (abort.signal.aborted || hooks.isCancelled?.()) throw new TurnCancelledError();
      throw err;
    } finally {
      clearTimeout(timeout);
      if (this.activeAbort === abort) this.activeAbort = undefined;
    }

    if (hooks.isCancelled?.()) throw new TurnCancelledError();

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Ollama chat failed (${resp.status}): ${body.slice(0, 200)}`);
    }

    const data = (await resp.json()) as { message?: { content?: string } };
    const raw = (data.message?.content ?? "").trim() ||
      (lang === "en"
        ? "I hear you, but my local brain returned nothing. Typical."
        : "Słyszę cię, ale mój lokalny mózg zwrócił pustkę. Typowe.");
    const spoken = prepareForSpeech(raw, lang);

    this.history.push({ role: "assistant", content: spoken });
    this.trimHistory();
    hooks.onAssistantText?.(spoken);

    log.info(`local SLM reply intent=${intent} chars=${spoken.length} text="${spoken.slice(0, 120)}${spoken.length > 120 ? "…" : ""}"`);
    return { spoken, runId: `slm-${Date.now()}` };
  }

  async cancelActiveTurn(): Promise<void> {
    this.activeAbort?.abort();
  }

  async dispose(): Promise<void> {
    this.activeAbort?.abort();
  }

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

function modeForIntent(
  intent: Intent,
  skin: AgentSkinId,
  memoryBlock?: string,
  traits?: TarsTraits,
  lang: ConversationLang = "pl",
): string {
  const chat =
    lang === "en"
      ? chatInstructionsForSkinEn(skin, traits)
      : chatInstructionsForSkin(skin, traits);
  switch (intent) {
    case "code":
      return lang === "en"
        ? `${codeInstructions()}\nLocal SLM mode — no file edits. Tell the user to ask for code, GitHub, or UiPath (cloud agent in BRAIN_MODE=hybrid).`
        : `${codeInstructions()}\nTryb lokalny SLM — bez edycji plików. Powiedz użytkownikowi, żeby poprosił o kod, GitHub lub UiPath (wtedy włączy się agent chmurowy w BRAIN_MODE=hybrid).`;
    case "net":
      return memoryBlock?.includes("WYNIKI WYSZUKIWANIA INTERNETU") ||
        memoryBlock?.includes("INTERNET SEARCH RESULTS")
        ? `${netSearchInstructions()}\n${lang === "en" ? "No cloud — answer from search results in context." : "Bez chmury — odpowiedz z wyników wyszukiwania w kontekście."}`
        : `${netLocalInstructions()}\n${lang === "en" ? "Try context memory; if missing data, say so plainly." : "Spróbuj odpowiedzieć z pamięci kontekstowej; jeśli brak danych — powiedz wprost."}`;
    default:
      return chat;
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
