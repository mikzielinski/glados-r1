package tech.glados.r1

import org.json.JSONObject

/**
 * Wire protocol mirror of backend/src/protocol.ts.
 *
 * TEXT frames are JSON control messages; BINARY frames are raw PCM (s16le,
 * mono) — microphone audio up, GLaDOS audio down.
 */
object Protocol {
    const val CLIENT_VERSION = "0.1.0"

    // ---- Outgoing (client -> server) ----

    fun hello(device: String, sessionId: String?, skin: String, tarsHonesty: Int? = null, tarsHumor: Int? = null, tarsSarcasm: Int? = null): String =
        JSONObject().apply {
            put("type", "hello")
            put("device", device)
            put("clientVersion", CLIENT_VERSION)
            if (sessionId != null) put("sessionId", sessionId)
            put("skin", skin)
            if (tarsHonesty != null && tarsHumor != null && tarsSarcasm != null) {
                put("tarsTraits", JSONObject().apply {
                    put("honesty", tarsHonesty)
                    put("humor", tarsHumor)
                    put("sarcasm", tarsSarcasm)
                })
            }
        }.toString()

    fun pttStart(sampleRate: Int): String =
        JSONObject().apply {
            put("type", "ptt_start")
            put("sampleRate", sampleRate)
        }.toString()

    fun pttEnd(): String = JSONObject().put("type", "ptt_end").toString()

    fun textInput(text: String): String =
        JSONObject().apply {
            put("type", "text")
            put("text", text)
        }.toString()

    fun cancel(): String = JSONObject().put("type", "cancel").toString()

    fun resetSession(): String = JSONObject().put("type", "reset_session").toString()

    fun ping(): String = JSONObject().put("type", "ping").toString()

    fun deviceContext(
        batteryPct: Int? = null,
        network: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        accuracyM: Double? = null,
        locationStatus: String? = null,
        photoBase64: String? = null,
        tarsHonesty: Int? = null,
        tarsHumor: Int? = null,
        tarsSarcasm: Int? = null,
    ): String = JSONObject().apply {
        put("type", "device_context")
        batteryPct?.let { put("batteryPct", it) }
        network?.let { put("network", it) }
        locationStatus?.let { put("locationStatus", it) }
        if (lat != null && lon != null) {
            put("location", JSONObject().apply {
                put("lat", lat)
                put("lon", lon)
                accuracyM?.let { put("accuracyM", it) }
            })
        }
        photoBase64?.let { put("photoBase64", it) }
        if (tarsHonesty != null && tarsHumor != null && tarsSarcasm != null) {
            put("tarsTraits", JSONObject().apply {
                put("honesty", tarsHonesty)
                put("humor", tarsHumor)
                put("sarcasm", tarsSarcasm)
            })
        }
    }.toString()

    // ---- Incoming (server -> client) ----

    sealed interface ServerEvent {
        data class Ready(val sessionId: String, val agentId: String?) : ServerEvent
        data class Status(val state: String, val detail: String?) : ServerEvent
        data class Transcript(val text: String) : ServerEvent
        data class AssistantText(val text: String, val final: Boolean) : ServerEvent
        data class TtsStart(val sampleRate: Int) : ServerEvent
        object TtsEnd : ServerEvent
        data class SessionReset(val sessionId: String) : ServerEvent
        data class Err(val message: String) : ServerEvent
        object PttAck : ServerEvent
        data class PttRejected(val reason: String) : ServerEvent
        object Pong : ServerEvent
        object Unknown : ServerEvent
    }

    fun parse(raw: String): ServerEvent {
        return try {
            val o = JSONObject(raw)
            when (o.optString("type")) {
                "ready" -> ServerEvent.Ready(
                    o.optString("sessionId"),
                    o.optString("agentId").ifEmpty { null },
                )
                "status" -> ServerEvent.Status(
                    o.optString("state"),
                    o.optString("detail").ifEmpty { null },
                )
                "transcript" -> ServerEvent.Transcript(o.optString("text"))
                "assistant_text" -> ServerEvent.AssistantText(
                    o.optString("text"),
                    o.optBoolean("final", false),
                )
                "tts_start" -> ServerEvent.TtsStart(o.optInt("sampleRate", 22050))
                "tts_end" -> ServerEvent.TtsEnd
                "session_reset" -> ServerEvent.SessionReset(o.optString("sessionId"))
                "error" -> ServerEvent.Err(o.optString("message"))
                "ptt_ack" -> ServerEvent.PttAck
                "ptt_rejected" -> ServerEvent.PttRejected(o.optString("reason"))
                "pong" -> ServerEvent.Pong
                else -> ServerEvent.Unknown
            }
        } catch (_: Exception) {
            ServerEvent.Unknown
        }
    }
}
