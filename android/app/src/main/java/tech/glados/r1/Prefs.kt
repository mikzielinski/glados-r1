package tech.glados.r1

import android.content.Context
import java.util.UUID

/** Small persistent store for the backend URL and conversation continuity. */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("glados", Context.MODE_PRIVATE)

    var backendUrl: String
        get() = sp.getString("backendUrl", DEFAULT_URL) ?: DEFAULT_URL
        set(value) = sp.edit().putString("backendUrl", value.trim()).apply()

    /** Last URL that connected successfully — tried first on next reconnect. */
    var lastWorkingBackendUrl: String?
        get() = sp.getString("lastWorkingBackendUrl", null)
        set(value) = sp.edit().putString("lastWorkingBackendUrl", value).apply()

    /** One or more WebSocket URLs (newline or comma separated). First reachable wins. */
    fun backendCandidates(): List<String> {
        val parsed = backendUrl
            .split('\n', ',')
            .map { it.trim().trimEnd('/') }
            .filter { it.isNotEmpty() }
            .distinct()
        return if (parsed.isEmpty()) listOf(DEFAULT_URL) else parsed
    }

    fun orderedBackendCandidates(): List<String> {
        val all = backendCandidates()
        val last = lastWorkingBackendUrl?.trim()?.trimEnd('/')
        if (!last.isNullOrEmpty() && all.any { it.equals(last, ignoreCase = true) }) {
            return listOf(last) + all.filterNot { it.equals(last, ignoreCase = true) }
        }
        return all
    }

    /** Stable per-install session id so the backend can resume the agent. */
    val sessionId: String
        get() {
            val existing = sp.getString("sessionId", null)
            if (existing != null) return existing
            return resetSession()
        }

    var agentId: String?
        get() = sp.getString("agentId", null)
        set(value) = sp.edit().putString("agentId", value).apply()

    var skinId: String
        get() = sp.getString("skinId", AgentSkin.HAL9000.id) ?: AgentSkin.HAL9000.id
        set(value) = sp.edit().putString("skinId", value).apply()

    val skin: AgentSkin
        get() = AgentSkin.fromId(skinId)

    var tarsHonesty: Int
        get() = sp.getInt("tarsHonesty", 90).coerceIn(0, 100)
        set(value) = sp.edit().putInt("tarsHonesty", value.coerceIn(0, 100)).apply()

    var tarsHumor: Int
        get() = sp.getInt("tarsHumor", 75).coerceIn(0, 100)
        set(value) = sp.edit().putInt("tarsHumor", value.coerceIn(0, 100)).apply()

    var tarsSarcasm: Int
        get() = sp.getInt("tarsSarcasm", 35).coerceIn(0, 100)
        set(value) = sp.edit().putInt("tarsSarcasm", value.coerceIn(0, 100)).apply()

    /** Stable per-device id for long-term contextual memory (survives session reset). */
    val memoryDeviceId: String
        get() {
            val existing = sp.getString("memoryDeviceId", null)
            if (existing != null) return existing
            val fresh = UUID.randomUUID().toString()
            sp.edit().putString("memoryDeviceId", fresh).apply()
            return fresh
        }

    /** New conversation id — clears cloud agent resume too. */
    fun resetSession(): String {
        val fresh = UUID.randomUUID().toString()
        sp.edit().putString("sessionId", fresh).remove("agentId").apply()
        return fresh
    }

    companion object {
        /** Default — add LAN IP as second line in SET for cable-free home WiFi. */
        const val DEFAULT_URL = "ws://glados-mac:8787/ws"
    }
}
