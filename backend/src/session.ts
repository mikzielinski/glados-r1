import type { WebSocket } from "ws";
import { CursorAgentError } from "@cursor/sdk";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { Brain, type BrainLike, TurnCancelledError } from "./brain.js";
import { EchoBrain } from "./echo-brain.js";
import { HybridBrain } from "./hybrid-brain.js";
import { SlmBrain } from "./slm-brain.js";
import { tryDeviceReply, isLocationQuery } from "./device-router.js";
import { tryChatReply } from "./chat-router.js";
import { brainStatusLabel, classifyIntent, needsCloudBrain, type Intent } from "./intent.js";
import { formatLocationFacts, isPlausibleLocation, reverseGeocodeLabel } from "./geocode.js";
import type { SkillRegistry } from "./skills.js";
import type { StandardsRegistry } from "./standards.js";
import type { MemoryStore } from "./memory-store.js";
import {
  isForceLearnQuery,
  isMemoryClearQuery,
  isMemoryListQuery,
  memoryListReply,
  parseLearnPayload,
} from "./memory-router.js";
import {
  applyTarsTraitChange,
  parseTarsTraitCommand,
  tarsTraitChangeReply,
  tarsTraitUnknownReply,
} from "./tars-traits-router.js";
import { sanitizeHalSpeech } from "./hal-speech.js";
import { normalizeTarsTraits, shapeTarsSpeech } from "./tars-traits.js";
import {
  extractSearchQuery,
  formatWebPromptBlock,
  searchWeb,
  shouldPrefetchWeb,
} from "./web-search.js";
import { WhisperStt } from "./stt.js";
import { GladosTts } from "./tts.js";
import { polishForSpeech } from "./spoken-polish.js";
import {
  CONTINUE_BUSY_HINT,
  isStopCommand,
  progressLine,
  STOP_ACK,
} from "./long-work.js";
import { type AssistantState, type ClientMessage, decode, encode, type ServerMessage } from "./protocol.js";

const log = logger("session");

const MAX_UTTERANCE_BYTES = 2 * 60 * 16000 * 2;
const TTS_CHUNK_BYTES = 16 * 1024;
const TTS_BACKPRESSURE_BYTES = 256 * 1024;
const MIN_UTTERANCE_MS = 350;
const CHAT_TURN_TIMEOUT_MS = 25_000;
const MAX_OUTBOUND_QUEUE = 256;

import { normalizeSkinId, type AgentSkinId } from "./agent-skins.js";
import type { DeviceContext } from "./device-context.js";

type Outbound = { kind: "text"; data: string } | { kind: "binary"; data: Buffer };

/** Cached reply when the client disconnects before hearing the full answer. */
interface PendingDelivery {
  transcript?: string;
  assistantText: string;
  ttsPcm: Buffer;
  ttsSampleRate: number;
  delivered: boolean;
}

export class Session {
  private readonly brain: BrainLike;
  private ws: WebSocket | null;
  private recording = false;
  private inputSampleRate: number;
  private chunks: Buffer[] = [];
  private bufferedBytes = 0;
  private busy = false;
  private cancelled = false;
  private deviceContext: DeviceContext = {};
  private phase: AssistantState = "idle";
  private phaseDetail?: string;
  private outbound: Outbound[] = [];
  private disposeTimer?: ReturnType<typeof setTimeout>;
  private pendingDelivery: PendingDelivery | null = null;
  private interruptRecording = false;
  private progressTimer?: ReturnType<typeof setInterval>;
  private progressFirstTimer?: ReturnType<typeof setTimeout>;
  private cloudWorkStartedAt = 0;
  private progressTick = 0;
  private asideSpeaking = false;
  private agentSkin: AgentSkinId = "hal9000";
  private deviceMemoryId = "";
  private lastUserTranscript = "";
  private lastAssistantText = "";

  constructor(
    readonly id: string,
    ws: WebSocket,
    private readonly cfg: Config,
    private readonly stt: WhisperStt,
    private readonly tts: GladosTts,
    resumeAgentId?: string,
    skills?: SkillRegistry,
    standards?: StandardsRegistry,
    private readonly memory?: MemoryStore,
  ) {
    this.ws = ws;
    this.inputSampleRate = cfg.inputSampleRate;
    this.brain = createBrain(cfg, resumeAgentId, skills, standards);
  }

  start(): void {
    void this.sendReady();
  }

  /** Client reconnected — resync state and deliver anything queued while offline. */
  attach(ws: WebSocket): void {
    this.ws = ws;
    if (this.disposeTimer) {
      clearTimeout(this.disposeTimer);
      this.disposeTimer = undefined;
    }
    void this.sendReady(true);
  }

  private async sendReady(reconnect = false): Promise<void> {
    try {
      await this.brain.prepare();
    } catch (err) {
      log.error(`session ${this.id}: agent prepare failed`, err);
      this.send({ type: "error", message: formatBrainError(err) });
    }

    this.send({ type: "ready", sessionId: this.id, agentId: this.brain.agentId });

    if (reconnect && this.pendingDelivery && !this.pendingDelivery.delivered) {
      log.info(
        `session ${this.id}: reattached — replaying undelivered reply (${this.pendingDelivery.ttsPcm.length} pcm bytes)`,
      );
      await this.deliverPendingReply(true);
      return;
    }

    this.setStatus(this.phase, this.phaseDetail);
    this.flushOutbound();
  }

  /** Socket gone — do NOT cancel in-flight agent work. */
  detach(): void {
    this.ws = null;
    // Drop orphaned partial frames; full reply will be replayed from pendingDelivery.
    this.outbound = [];
    if (this.recording) {
      this.recording = false;
      this.chunks = [];
      this.bufferedBytes = 0;
    }
  }

  scheduleDispose(delayMs: number, onFire: () => void): void {
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.disposeTimer = setTimeout(() => {
      if (this.busy || (this.pendingDelivery && !this.pendingDelivery.delivered)) {
        log.info(`session ${this.id}: dispose delayed — busy or undelivered reply`);
        this.scheduleDispose(delayMs, onFire);
        return;
      }
      onFire();
    }, delayMs);
  }

  async dispose(): Promise<void> {
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.stopCloudProgress();
    await this.brain.dispose();
  }

  handleText(raw: string): void {
    const msg = decode(raw);
    if (!msg) return;
    void this.onMessage(msg);
  }

  handleBinary(data: Buffer): void {
    if (!this.recording) return;
    if (this.bufferedBytes + data.length > MAX_UTTERANCE_BYTES) {
      log.warn(`session ${this.id}: utterance exceeded cap, dropping audio`);
      return;
    }
    this.chunks.push(data);
    this.bufferedBytes += data.length;
  }

  private async onMessage(msg: ClientMessage): Promise<void> {
    switch (msg.type) {
      case "hello":
        log.info(`session ${this.id}: hello from ${msg.device} v${msg.clientVersion} skin=${msg.skin ?? "hal9000"}`);
        {
          const next = normalizeSkinId(msg.skin ?? this.agentSkin);
          if (next !== this.agentSkin) {
            this.agentSkin = next;
            this.brain.resetChatContext?.();
            log.info(`session ${this.id}: agent skin → ${next}`);
          } else {
            this.agentSkin = next;
          }
          if (msg.tarsTraits) {
            this.deviceContext.tarsTraits = normalizeTarsTraits(msg.tarsTraits);
          }
          if (msg.memoryDeviceId?.trim()) {
            this.deviceMemoryId = msg.memoryDeviceId.trim();
          }
          void this.publishMemoryStatus();
        }
        break;
      case "reset_session":
        await this.resetConversation("client reset_session");
        break;
      case "ping":
        this.send({ type: "pong" });
        break;
      case "device_context":
        this.deviceContext = {
          batteryPct: msg.batteryPct,
          network: msg.network,
          location: msg.location,
          locationStatus: msg.locationStatus,
          photoBase64: msg.photoBase64,
          tarsTraits: msg.tarsTraits
            ? normalizeTarsTraits(msg.tarsTraits)
            : this.deviceContext.tarsTraits,
        };
        void this.resolveLocationLabel();
        log.info(
          `session ${this.id}: device ctx battery=${msg.batteryPct ?? "?"}% net=${msg.network ?? "?"} gps=${msg.location ? `${msg.location.lat.toFixed(4)},${msg.location.lon.toFixed(4)}` : msg.locationStatus ?? "none"}`,
        );
        break;
      case "ptt_start":
        this.beginRecording(msg.sampleRate);
        break;
      case "ptt_end":
        await this.endRecordingAndProcess();
        break;
      case "text":
        await this.processUtterance(msg.text);
        break;
      case "cancel":
        this.cancelled = true;
        log.info(`session ${this.id}: cancel requested`);
        void this.brain.cancelActiveTurn?.();
        break;
      case "memory_learn":
        await this.handleMemoryLearn(msg.text, msg.title, msg.force === true);
        break;
      case "memory_upload":
        await this.handleMemoryUpload(msg.filename, msg.base64, msg.force === true);
        break;
      case "memory_list":
        await this.publishMemoryStatus();
        break;
      case "memory_forget":
        await this.handleMemoryForget(msg.id);
        break;
      case "memory_clear":
        await this.handleMemoryClear();
        break;
    }
  }

  private memoryKey(): string {
    return this.deviceMemoryId || this.id;
  }

  private async publishMemoryStatus(): Promise<void> {
    if (!this.memory) return;
    const status = await this.memory.getStatus(this.memoryKey());
    this.send({
      type: "memory_status",
      count: status.count,
      userName: status.userName,
      entries: status.entries,
    });
  }

  private async handleMemoryLearn(text: string, title?: string, force = false): Promise<void> {
    if (!this.memory) {
      this.send({ type: "error", message: "Pamięć kontekstowa wyłączona na serwerze." });
      return;
    }
    try {
      const entry = await this.memory.learnText(this.memoryKey(), text, { title, force });
      this.send({ type: "memory_learned", id: entry.id, title: entry.title, count: await this.memory.count(this.memoryKey()) });
      await this.publishMemoryStatus();
    } catch (err) {
      this.send({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  private async handleMemoryUpload(filename: string, base64: string, force = false): Promise<void> {
    if (!this.memory) {
      this.send({ type: "error", message: "Pamięć kontekstowa wyłączona na serwerze." });
      return;
    }
    try {
      const data = Buffer.from(base64, "base64");
      const entry = await this.memory.ingestFile(this.memoryKey(), filename, data, force);
      this.send({ type: "memory_learned", id: entry.id, title: entry.title, count: await this.memory.count(this.memoryKey()) });
      await this.publishMemoryStatus();
    } catch (err) {
      this.send({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  private async handleMemoryForget(entryId: string): Promise<void> {
    if (!this.memory) return;
    await this.memory.forget(this.memoryKey(), entryId);
    await this.publishMemoryStatus();
  }

  private async handleMemoryClear(): Promise<void> {
    if (!this.memory) return;
    const n = await this.memory.clear(this.memoryKey());
    await this.publishMemoryStatus();
    await this.speak(`Wyczyszczono pamięć. Usunięto ${n} wpisów.`);
  }

  private async tryMemoryTurn(transcript: string): Promise<boolean> {
    if (!this.memory) return false;
    const key = this.memoryKey();

    if (isMemoryClearQuery(transcript)) {
      await this.handleMemoryClear();
      return true;
    }

    if (isMemoryListQuery(transcript)) {
      const reply = await memoryListReply(this.memory, key, this.agentSkin);
      await this.speak(reply, transcript);
      return true;
    }

    const learnText = parseLearnPayload(transcript);
    if (learnText) {
      const entry = await this.memory.learnText(key, learnText, { force: true });
      await this.publishMemoryStatus();
      await this.speak(`Zapamiętałem: ${entry.title}.`, transcript);
      return true;
    }

    if (isForceLearnQuery(transcript)) {
      const bundle = [this.lastUserTranscript, this.lastAssistantText].filter(Boolean).join("\n\n");
      if (bundle.trim().length < 8) {
        await this.speak(
          "Nie mam jeszcze rozmowy do nauki. Powiedz «zapamiętaj, że…» albo dodaj plik w ustawieniach.",
          transcript,
        );
        return true;
      }
      const entry = await this.memory.learnText(key, bundle, {
        title: "Wymuszone uczenie z rozmowy",
        kind: "note",
        force: true,
      });
      await this.publishMemoryStatus();
      await this.speak(`Wymusiłem naukę — zapisano: ${entry.title}.`, transcript);
      return true;
    }

    return false;
  }

  private async tryTarsTraitsTurn(transcript: string): Promise<boolean> {
    if (this.agentSkin !== "tars") return false;

    const req = parseTarsTraitCommand(transcript);
    if (!req) {
      const t = transcript.toLowerCase();
      const looksLikeConfig =
        /\btars\b/.test(t) &&
        /ustaw|poziom|zwi[eę]ksz|zmniejsz|humor|szczer|sarkazm|zart|żart|reguluj|konfigur/.test(t);
      if (!looksLikeConfig) return false;
      const current = normalizeTarsTraits(this.deviceContext.tarsTraits);
      await this.speak(tarsTraitUnknownReply(transcript, current), transcript, true);
      return true;
    }

    const current = normalizeTarsTraits(this.deviceContext.tarsTraits);

    const { traits, from, to } = applyTarsTraitChange(current, req);
    this.deviceContext.tarsTraits = traits;
    this.send({
      type: "tars_traits_updated",
      honesty: traits.honesty,
      humor: traits.humor,
      sarcasm: traits.sarcasm,
      changed: req.trait,
      from,
      to,
    });
    log.info(
      `session ${this.id}: TARS ${req.trait} ${from}→${to} (H${traits.honesty}/Hu${traits.humor}/S${traits.sarcasm})`,
    );

    const reply = tarsTraitChangeReply(req.trait, from, to, traits);
    await this.speak(reply, transcript, true);
    return true;
  }

  private async finalizeSpeech(text: string, tarsAlreadyShaped = false): Promise<string> {
    let spoken = polishForSpeech(text);
    if (this.agentSkin === "hal9000") {
      const userName = this.memory ? await this.memory.getUserName(this.memoryKey()) : undefined;
      spoken = sanitizeHalSpeech(spoken, this.agentSkin, userName);
    }
    if (this.agentSkin === "tars" && !tarsAlreadyShaped) {
      const traits = normalizeTarsTraits(this.deviceContext.tarsTraits);
      spoken = shapeTarsSpeech(spoken, traits, "llm");
    }
    return spoken;
  }

  private async resetConversation(reason: string): Promise<void> {
    log.info(`session ${this.id}: reset — ${reason}`);
    this.cancelled = false;
    this.busy = false;
    this.pendingDelivery = null;
    this.chunks = [];
    this.bufferedBytes = 0;
    this.recording = false;
    this.stopCloudProgress();
    this.brain.resetChatContext?.();
    this.setStatus("idle");
    this.send({ type: "session_reset", sessionId: this.id });
  }

  private beginRecording(sampleRate: number): void {
    if (this.busy) {
      if (this.canInterrupt()) {
        this.interruptRecording = true;
      } else {
        this.send({ type: "ptt_rejected", reason: "Still processing the previous request." });
        return;
      }
    } else {
      this.interruptRecording = false;
    }
    this.inputSampleRate = sampleRate || this.cfg.inputSampleRate;
    this.recording = true;
    this.chunks = [];
    this.bufferedBytes = 0;
    this.setStatus("listening");
    this.send({ type: "ptt_ack" });
  }

  private async endRecordingAndProcess(): Promise<void> {
    if (!this.recording) return;
    this.recording = false;
    const pcm = Buffer.concat(this.chunks);
    this.chunks = [];
    this.bufferedBytes = 0;

    const durationMs = pcm.length / (this.inputSampleRate * 2) * 1000;
    if (pcm.length === 0 || durationMs < MIN_UTTERANCE_MS) {
      this.send({
        type: "error",
        message: durationMs < MIN_UTTERANCE_MS
          ? "Hold the button a little longer."
          : "No audio received.",
      });
      if (!this.interruptRecording) this.setStatus("idle");
      return;
    }

    if (this.interruptRecording) {
      await this.handleInterruptUtterance(pcm);
      return;
    }

    this.busy = true;
    this.setStatus("thinking", "transcribing");
    let transcript = "";
    try {
      transcript = await this.stt.transcribe(pcm, this.inputSampleRate);
    } catch (err) {
      log.error(`session ${this.id}: STT failed`, err);
      this.send({ type: "error", message: "Speech recognition failed." });
      this.busy = false;
      this.setStatus("idle");
      return;
    }

    if (this.cancelled) {
      this.cancelled = false;
      this.busy = false;
      this.setStatus("idle");
      return;
    }

    if (!transcript.trim()) {
      this.send({ type: "error", message: "No speech detected. Speak closer to the device." });
      this.busy = false;
      this.setStatus("idle");
      return;
    }

    this.send({ type: "transcript", text: transcript });
    await this.processUtterance(transcript);
  }

  private async processUtterance(transcript: string): Promise<void> {
    if (this.busy && this.recording) {
      this.send({ type: "error", message: "One request at a time, please." });
      return;
    }
    this.busy = true;
    this.cancelled = false;
    this.pendingDelivery = null;
    const intent = classifyIntent(transcript);
    this.setStatus("thinking", brainStatusLabel(intent));

    const timeoutMs = needsCloudBrain(intent)
      ? this.cfg.cloudTurnTimeoutMs
      : CHAT_TURN_TIMEOUT_MS;
    try {
      await withTimeout(
        this.runTurn(transcript, intent),
        timeoutMs,
        needsCloudBrain(intent)
          ? "Agent chmurowy nie zdążył w limicie czasu. Spróbuj krótszej prośby albo poczekaj i powtórz."
          : "Lokalny model nie odpowiedział na czas. Spróbuj ponownie — krótsze pytanie albo prośba o kod włączy agenta chmurowego.",
      );
      this.markTurnComplete();
    } catch (err) {
      if (err instanceof TurnCancelledError) {
        log.info(`session ${this.id}: cloud turn cancelled`);
        this.stopCloudProgress();
        await this.speak(STOP_ACK).catch(() => {});
        this.markTurnComplete();
        return;
      }
      const message = formatBrainError(err);
      log.error(`session ${this.id}: turn failed`, err);
      this.send({ type: "error", message });
      await this.speak(message, transcript).catch(() => {});
      this.markTurnComplete();
    } finally {
      this.busy = false;
      this.cancelled = false;
    }
  }

  private async runTurn(transcript: string, intent: Intent): Promise<void> {
    this.lastUserTranscript = transcript.trim();
    if (!needsCloudBrain(intent)) {
      if (await this.tryTarsTraitsTurn(transcript)) return;
      if (await this.tryMemoryTurn(transcript)) return;
      if (isLocationQuery(transcript)) await this.resolveLocationLabel();
      const instant = tryDeviceReply(transcript, this.deviceContext, this.agentSkin);
      if (instant) {
        log.info(`session ${this.id}: device fast-path reply`);
        await this.speak(instant, transcript, true);
        return;
      }
      const chat = tryChatReply(transcript, this.deviceContext, this.agentSkin);
      if (chat) {
        log.info(`session ${this.id}: chat template reply`);
        await this.speak(chat, transcript, true);
        return;
      }
    }

    const contextHint = formatDeviceContext(this.deviceContext);
    const enriched = contextHint ? `${transcript}\n\n[Device context: ${contextHint}]` : transcript;
    let memoryBlock = this.memory
      ? await this.memory.getPromptBlock(this.memoryKey(), transcript)
      : "";

    if (this.cfg.webSearchEnabled && shouldPrefetchWeb(transcript, intent, memoryBlock)) {
      try {
        const q = extractSearchQuery(transcript);
        this.setStatus("thinking", "web");
        const web = await searchWeb(q, this.cfg);
        const webBlock = formatWebPromptBlock(web);
        memoryBlock = [memoryBlock, webBlock].filter(Boolean).join("\n\n");
        log.info(`session ${this.id}: web "${q}" -> ${web.hits.length} hits (${web.provider})`);
      } catch (err) {
        log.warn(`session ${this.id}: web search failed`, err);
        memoryBlock = [memoryBlock, "WYSZUKIWANIE INTERNETU: nie udało się pobrać wyników."].filter(Boolean).join("\n\n");
      }
    }

    const cloudTurn = needsCloudBrain(intent);
    if (cloudTurn) this.startCloudProgress();

    try {
      const result = await this.brain.handleTurn(enriched, intent, {
        onWorking: () => this.setStatus("working"),
        isCancelled: () => this.cancelled,
        skin: this.agentSkin,
        tarsTraits: this.deviceContext.tarsTraits,
        memoryBlock,
      });
      if (this.cancelled) return;
      await this.speak(result.spoken, transcript);
    } finally {
      if (cloudTurn) this.stopCloudProgress();
    }
  }

  private canInterrupt(): boolean {
    return this.phase === "working" ||
      (this.phase === "thinking" && this.phaseDetail === "cloud");
  }

  private async handleInterruptUtterance(pcm: Buffer): Promise<void> {
    this.interruptRecording = false;
    this.setStatus(this.phase, this.phaseDetail ?? "interrupt");

    let transcript = "";
    try {
      transcript = await this.stt.transcribe(pcm, this.inputSampleRate);
    } catch (err) {
      log.error(`session ${this.id}: interrupt STT failed`, err);
      this.send({ type: "error", message: "Speech recognition failed." });
      return;
    }

    if (!transcript.trim()) {
      this.send({ type: "error", message: "No speech detected." });
      return;
    }

    this.send({ type: "transcript", text: transcript });
    log.info(`session ${this.id}: interrupt transcript "${transcript}"`);

    if (isStopCommand(transcript)) {
      this.cancelled = true;
      await this.brain.cancelActiveTurn?.();
      return;
    }

    await this.speakAside(CONTINUE_BUSY_HINT);
  }

  private startCloudProgress(): void {
    this.stopCloudProgress();
    this.cloudWorkStartedAt = Date.now();
    this.progressTick = 0;
    const intervalMs = Math.max(15_000, this.cfg.cloudProgressIntervalMs);
    const firstMs = Math.min(30_000, intervalMs);
    this.progressFirstTimer = setTimeout(() => this.tickProgress(), firstMs);
    this.progressTimer = setInterval(() => this.tickProgress(), intervalMs);
  }

  private tickProgress(): void {
    if (this.cancelled || this.phase === "idle") return;
    const elapsedSec = Math.max(1, Math.round((Date.now() - this.cloudWorkStartedAt) / 1000));
    void this.speakAside(progressLine(this.progressTick++, elapsedSec));
  }

  private stopCloudProgress(): void {
    if (this.progressFirstTimer) {
      clearTimeout(this.progressFirstTimer);
      this.progressFirstTimer = undefined;
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
  }

  private async speakAside(text: string): Promise<void> {
    if (this.cancelled || this.asideSpeaking || !this.isWsOpen()) return;
    this.asideSpeaking = true;
    const prevState = this.phase;
    const prevDetail = this.phaseDetail;
    try {
      const spoken = await this.finalizeSpeech(text);
      log.info(`session ${this.id}: aside chars=${spoken.length}`);
      const { pcm, sampleRate } = await this.tts.synthesize(spoken, this.agentSkin);
      if (pcm.length === 0 || this.cancelled || !this.isWsOpen()) return;

      this.send({ type: "assistant_text", text: spoken, final: false });
      this.setStatus("speaking", "progress");
      this.send({ type: "tts_start", sampleRate, format: "pcm_s16le" });
      for (let off = 0; off < pcm.length; off += TTS_CHUNK_BYTES) {
        if (this.cancelled || !this.isWsOpen()) break;
        const chunk = pcm.subarray(off, Math.min(off + TTS_CHUNK_BYTES, pcm.length));
        await this.sendBinaryBurst(chunk);
      }
      if (this.isWsOpen()) {
        this.send({ type: "tts_end" });
        this.setStatus(prevState, prevDetail);
      }
    } finally {
      this.asideSpeaking = false;
    }
  }

  private markTurnComplete(): void {
    if (this.pendingDelivery && !this.pendingDelivery.delivered) {
      this.phase = "speaking";
      this.phaseDetail = "resuming";
      log.info(`session ${this.id}: turn done but reply not yet delivered to client`);
      return;
    }
    this.setStatus("idle");
  }

  private async speak(text: string, transcript?: string, tarsAlreadyShaped = false): Promise<void> {
    if (this.cancelled) return;
    const spoken = await this.finalizeSpeech(text, tarsAlreadyShaped);
    this.lastAssistantText = spoken;
    log.info(`session ${this.id}: speak chars=${spoken.length} "${spoken.slice(0, 100)}${spoken.length > 100 ? "…" : ""}"`);
    const { pcm, sampleRate } = await this.tts.synthesize(spoken, this.agentSkin);
    if (pcm.length === 0 || this.cancelled) return;

    this.pendingDelivery = {
      transcript,
      assistantText: spoken,
      ttsPcm: pcm,
      ttsSampleRate: sampleRate,
      delivered: false,
    };
    await this.deliverPendingReply(false);
  }

  /** Resolve GPS fix to a Polish place name (not raw coordinates for speech). */
  private async resolveLocationLabel(): Promise<void> {
    const loc = this.deviceContext.location;
    if (!loc || !isPlausibleLocation(loc.lat, loc.lon, loc.accuracyM)) {
      this.deviceContext.locationLabel = undefined;
      return;
    }
    const label = await reverseGeocodeLabel(loc.lat, loc.lon);
    if (label) this.deviceContext.locationLabel = label;
  }

  /** Send (or resend) the full transcript + assistant text + TTS stream. */
  private async deliverPendingReply(replay: boolean): Promise<void> {
    const pending = this.pendingDelivery;
    if (!pending || pending.delivered) return;

    if (replay && pending.transcript) {
      this.send({ type: "transcript", text: pending.transcript });
    } else if (!replay && pending.transcript) {
      // Transcript already sent before processUtterance on first pass.
    }

    this.send({ type: "assistant_text", text: pending.assistantText, final: true });
    this.setStatus("speaking", replay ? "resuming" : undefined);
    this.send({ type: "tts_start", sampleRate: pending.ttsSampleRate, format: "pcm_s16le" });

    for (let off = 0; off < pending.ttsPcm.length; off += TTS_CHUNK_BYTES) {
      if (this.cancelled || !this.isWsOpen()) break;
      const chunk = pending.ttsPcm.subarray(off, Math.min(off + TTS_CHUNK_BYTES, pending.ttsPcm.length));
      await this.sendBinaryBurst(chunk);
      if ((off / TTS_CHUNK_BYTES) % 8 === 7) {
        await new Promise<void>((r) => setImmediate(r));
      }
    }
    if (!this.isWsOpen()) {
      log.warn(`session ${this.id}: reply send incomplete — will replay on next attach`);
      return;
    }
    this.send({ type: "tts_end" });

    if (this.isWsOpen()) {
      pending.delivered = true;
      this.pendingDelivery = null;
      this.setStatus("idle");
      log.info(`session ${this.id}: reply delivered (${replay ? "replay" : "live"})`);
    } else {
      log.warn(`session ${this.id}: reply send incomplete — will replay on next attach`);
    }
  }

  private isWsOpen(): boolean {
    const socket = this.ws;
    return socket != null && socket.readyState === socket.OPEN;
  }

  private setStatus(state: AssistantState, detail?: string): void {
    this.phase = state;
    this.phaseDetail = detail;
    this.send({ type: "status", state, detail });
  }

  private send(msg: ServerMessage): void {
    this.enqueue({ kind: "text", data: encode(msg) });
  }

  private sendBinary(data: Buffer): void {
    this.enqueue({ kind: "binary", data });
  }

  /** Send TTS PCM quickly; only pause on socket backpressure. */
  private async sendBinaryBurst(data: Buffer): Promise<void> {
    const socket = this.ws;
    if (!socket || socket.readyState !== socket.OPEN) return;

    while (socket.bufferedAmount > TTS_BACKPRESSURE_BYTES) {
      if (!this.isWsOpen()) return;
      await sleep(10);
    }

    socket.send(data);
  }

  private enqueue(item: Outbound): void {
    const socket = this.ws;
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(item.kind === "text" ? item.data : item.data);
      return;
    }
    if (this.outbound.length >= MAX_OUTBOUND_QUEUE) this.outbound.shift();
    this.outbound.push(item);
  }

  private flushOutbound(): void {
    const socket = this.ws;
    if (!socket || socket.readyState !== socket.OPEN) return;
    const pending = this.outbound.splice(0);
    for (const item of pending) {
      if (item.kind === "text") socket.send(item.data);
      else socket.send(item.data);
    }
  }
}

function createBrain(
  cfg: Config,
  resumeAgentId?: string,
  skills?: SkillRegistry,
  standards?: StandardsRegistry,
): BrainLike {
  switch (cfg.brainMode) {
    case "echo":
      return new EchoBrain();
    case "slm":
      return new SlmBrain(cfg);
    case "hybrid":
      return new HybridBrain(cfg, resumeAgentId, skills, standards);
    default:
      return new Brain(cfg, resumeAgentId, skills, standards);
  }
}

function formatDeviceContext(ctx: DeviceContext): string {
  const parts: string[] = [];
  if (ctx.batteryPct != null) parts.push(`battery ${ctx.batteryPct}%`);
  if (ctx.network) parts.push(`network ${ctx.network}`);
  if (ctx.location && isPlausibleLocation(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM)) {
    parts.push(formatLocationFacts(ctx.location.lat, ctx.location.lon, ctx.location.accuracyM, ctx.locationLabel));
  } else if (ctx.locationStatus) {
    parts.push(`GPS status ${ctx.locationStatus}`);
  }
  if (ctx.photoBase64) parts.push("camera photo attached (base64 JPEG on device)");
  return parts.join("; ");
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBrainError(err: unknown): string {
  if (err instanceof CursorAgentError) {
    const msg = err.message.toLowerCase();
    if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("authentication")) {
      return "Invalid Cursor API key. Update CURSOR_API_KEY in backend/.env.";
    }
    if (msg.includes("not found")) {
      return "Agent session expired. A new session was started — please try again.";
    }
    return `Cursor error: ${err.message}`;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("ollama")) {
      return err.message;
    }
    return err.message;
  }
  return "Something went wrong while I was working.";
}
