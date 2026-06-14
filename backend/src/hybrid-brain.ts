import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { Brain, type BrainLike, type TurnHooks, type TurnResult } from "./brain.js";
import type { Intent } from "./intent.js";
import { needsCloudBrain } from "./intent.js";
import type { SkillRegistry } from "./skills.js";
import type { StandardsRegistry } from "./standards.js";
import { SlmBrain } from "./slm-brain.js";

const log = logger("hybrid-brain");

/**
 * Routes turns by intent:
 *   chat → local Ollama SLM
 *   code, net → Cursor cloud agent (repo + skills + PDF standards)
 */
export class HybridBrain implements BrainLike {
  private readonly slm: SlmBrain;
  private readonly cursor: Brain;
  private cursorPrepared = false;

  constructor(
    cfg: Config,
    resumeAgentId?: string,
    skills?: SkillRegistry,
    standards?: StandardsRegistry,
  ) {
    this.slm = new SlmBrain(cfg);
    this.cursor = new Brain(cfg, resumeAgentId, skills, standards);
  }

  get agentId(): string | undefined {
    return this.cursor.agentId ?? this.slm.agentId;
  }

  async prepare(): Promise<void> {
    await this.slm.prepare();
  }

  async handleTurn(transcript: string, intent: Intent, hooks: TurnHooks = {}): Promise<TurnResult> {
    if (!needsCloudBrain(intent)) {
      log.info(`routing to local SLM intent=${intent}`);
      return this.slm.handleTurn(transcript, intent, hooks);
    }

    log.info(`routing to cloud Cursor intent=${intent}`);
    await this.ensureCursor();
    return this.cursor.handleTurn(transcript, intent, hooks);
  }

  async cancelActiveTurn(): Promise<void> {
    await this.cursor.cancelActiveTurn();
  }

  resetChatContext(): void {
    this.slm.resetChatContext?.();
  }

  private async ensureCursor(): Promise<void> {
    if (this.cursorPrepared) return;
    await this.cursor.prepare();
    this.cursorPrepared = true;
  }

  async dispose(): Promise<void> {
    await this.cursor.dispose();
  }
}
