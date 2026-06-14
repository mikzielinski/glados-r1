import { randomUUID } from "node:crypto";
import type { BrainLike, TurnHooks, TurnResult } from "./brain.js";
import type { Intent } from "./intent.js";
import { logger } from "./logger.js";

const log = logger("echo-brain");

/**
 * Test/demo brain that does NOT call the Cursor SDK. It returns a canned
 * GLaDOS reply so the full audio pipeline (STT -> brain -> TTS) can be
 * exercised end-to-end without an API key or a target repo. Enable with
 * BRAIN_MODE=echo.
 */
export class EchoBrain implements BrainLike {
  readonly agentId = `echo-${randomUUID().slice(0, 8)}`;

  async prepare(): Promise<void> {}

  async handleTurn(
    transcript: string,
    intent: Intent,
    hooks: TurnHooks = {},
    _modeOverride?: string,
  ): Promise<TurnResult> {
    log.info(`echo turn intent=${intent}: "${transcript}"`);
    if (intent === "code") {
      hooks.onWorking?.();
      await new Promise((r) => setTimeout(r, 300));
      return {
        spoken: `I would have edited the repository to handle "${transcript}", but this is only a test. How thrilling for us both.`,
        runId: this.agentId,
      };
    }
    return {
      spoken: `You said: ${transcript}. Fascinating. Truly groundbreaking work, test subject.`,
      runId: this.agentId,
    };
  }

  async dispose(): Promise<void> {
    // nothing to clean up
  }
}
