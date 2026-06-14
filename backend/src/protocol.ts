/**
 * Wire protocol between the R1 client and the backend brain.
 *
 * Two frame kinds over one WebSocket:
 *  - TEXT frames carry JSON control messages (the types below).
 *  - BINARY frames carry raw PCM audio (s16le, mono):
 *      * client -> server: microphone audio between `ptt_start` and `ptt_end`.
 *      * server -> client: TTS audio between `tts_start` and `tts_end`.
 */

export type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "working"
  | "speaking"
  | "error";

/** Messages sent by the R1 client to the backend. */
export type ClientMessage =
  | {
      type: "hello";
      device: string;
      clientVersion: string;
      sessionId?: string;
      skin?: string;
      tarsTraits?: { honesty?: number; humor?: number; sarcasm?: number };
    }
  | { type: "reset_session" }
  | { type: "ptt_start"; sampleRate: number }
  | { type: "ptt_end" }
  | { type: "text"; text: string } // typed/debug input, bypasses STT
  | { type: "cancel" }
  | { type: "ping" }
  | {
      type: "device_context";
      batteryPct?: number;
      network?: string;
      location?: { lat: number; lon: number; accuracyM?: number };
      locationStatus?: string;
      photoBase64?: string;
      tarsTraits?: { honesty?: number; humor?: number; sarcasm?: number };
    };

/** Messages sent by the backend to the R1 client. */
export type ServerMessage =
  | { type: "ready"; sessionId: string; agentId?: string }
  | { type: "session_reset"; sessionId: string }
  | { type: "status"; state: AssistantState; detail?: string }
  | { type: "transcript"; text: string }
  | { type: "assistant_text"; text: string; final: boolean }
  | { type: "tts_start"; sampleRate: number; format: "pcm_s16le" }
  | { type: "tts_end" }
  | { type: "error"; message: string }
  | { type: "ptt_ack" }
  | { type: "ptt_rejected"; reason: string }
  | { type: "pong" };

export function encode(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function decode(raw: string): ClientMessage | null {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.type === "string") return obj as ClientMessage;
  } catch {
    // ignore malformed frames
  }
  return null;
}
