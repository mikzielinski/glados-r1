import type { WebSocket } from "ws";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import type { SkillRegistry } from "./skills.js";
import type { StandardsRegistry } from "./standards.js";
import type { MemoryStore } from "./memory-store.js";
import { Session } from "./session.js";
import { WhisperStt } from "./stt.js";
import { GladosTts } from "./tts.js";

const log = logger("sessions");

/** Keep detached sessions alive so in-flight agent runs can finish and replay. */
const IDLE_DISPOSE_MS = 30 * 60 * 1000;

export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly cfg: Config,
    private readonly stt: WhisperStt,
    private readonly tts: GladosTts,
    private readonly skills: SkillRegistry,
    private readonly standards: StandardsRegistry,
    private readonly memory: MemoryStore,
  ) {}

  attach(
    sessionId: string,
    ws: WebSocket,
    resumeAgentId?: string,
  ): Session {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      log.info(`session ${sessionId}: reconnect — reattaching socket`);
      existing.attach(ws);
      return existing;
    }

    log.info(`session ${sessionId}: new session resume=${resumeAgentId ?? "none"}`);
    const session = new Session(sessionId, ws, this.cfg, this.stt, this.tts, resumeAgentId, this.skills, this.standards, this.memory);
    this.sessions.set(sessionId, session);
    session.start();
    return session;
  }

  detach(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    log.info(`session ${sessionId}: socket closed — keeping session alive for in-flight work`);
    session.detach();
    session.scheduleDispose(IDLE_DISPOSE_MS, () => {
      if (this.sessions.get(sessionId) === session) {
        log.info(`session ${sessionId}: idle timeout — disposing`);
        void session.dispose().finally(() => this.sessions.delete(sessionId));
      }
    });
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.sessions.values()].map((s) => s.dispose()));
    this.sessions.clear();
  }
}
