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
      memoryDeviceId?: string;
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
    }
  | { type: "memory_learn"; text: string; title?: string; force?: boolean }
  | { type: "memory_upload"; filename: string; mime?: string; base64: string; force?: boolean }
  | { type: "memory_list" }
  | { type: "memory_forget"; id: string }
  | { type: "memory_clear"; scope?: "device" | "all" };

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
  | { type: "pong" }
  | {
      type: "memory_status";
      count: number;
      userName?: string;
      entries: Array<{
        id: string;
        kind: string;
        title: string;
        preview: string;
        source?: string;
        updatedAt: number;
      }>;
    }
  | { type: "memory_learned"; id: string; title: string; count: number }
  | {
      type: "tars_traits_updated";
      honesty: number;
      humor: number;
      sarcasm: number;
      changed: "honesty" | "humor" | "sarcasm";
      from: number;
      to: number;
    };

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
