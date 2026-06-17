package tech.glados.r1

import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString
import java.util.concurrent.TimeUnit

/**
 * WebSocket client to the OKO backend with auto-reconnect and application-level
 * heartbeat. OkHttp WebSocket ping is disabled — it was killing connections
 * during long TTS streams on flaky WiFi.
 */
class GladosClient(
    private val prefs: Prefs,
    private val listener: Listener,
) {
    interface Listener {
        fun onConnected()
        fun onReady()
        fun onReconnecting()
        fun onOffline()
        fun onEvent(event: Protocol.ServerEvent)
        fun onTtsAudio(bytes: ByteArray)
    }

    companion object {
        private const val TAG = "GladosClient"
        private const val MAX_BACKOFF_MS = 8_000L
        private const val HEARTBEAT_MS = 25_000L
    }

    private val main = Handler(Looper.getMainLooper())
    private val heartbeatThread = HandlerThread("oko-ws-heartbeat").apply { start() }
    private val heartbeatHandler = Handler(heartbeatThread.looper)
    // Serial dispatch keeps tts_start before PCM chunks (order is lost across threads).
    private val wsThread = HandlerThread("oko-ws-dispatch").apply { start() }
    private val wsHandler = Handler(wsThread.looper)

    private val http = OkHttpClient.Builder()
        // Disable OkHttp WS ping — it caused "no pong within 12000ms" during TTS.
        .pingInterval(0, TimeUnit.MILLISECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var ws: WebSocket? = null
    private var shouldRun = false
    private var backoff = 800L
    private var reconnectPending = false
    private var deathHandled = false
    private var ready = false

    @Volatile var isConnected = false
        private set

    private val heartbeat = object : Runnable {
        override fun run() {
            if (!shouldRun || !isConnected) return
            sendText(Protocol.ping())
            heartbeatHandler.postDelayed(this, HEARTBEAT_MS)
        }
    }

    fun connect() {
        shouldRun = true
        deathHandled = false
        openSocket()
    }

    fun close() {
        shouldRun = false
        reconnectPending = false
        deathHandled = true
        heartbeatHandler.removeCallbacks(heartbeat)
        wsHandler.removeCallbacksAndMessages(null)
        main.removeCallbacksAndMessages(null)
        ws?.close(1000, "client closing")
        ws = null
        isConnected = false
        ready = false
        main.post { listener.onOffline() }
    }

    private fun openSocket() {
        if (!shouldRun) return
        ws?.close(1000, "reconnecting")
        ws = null
        isConnected = false
        ready = false
        deathHandled = false

        val base = prefs.backendUrl.trimEnd('/')
        val agent = prefs.agentId
        val url = buildString {
            append(base)
            append("?sessionId=").append(prefs.sessionId)
            if (agent != null) append("&agentId=").append(agent)
        }
        Log.i(TAG, "connecting to $url")
        ws = http.newWebSocket(Request.Builder().url(url).build(), socketListener)
    }

    private fun scheduleReconnect() {
        if (!shouldRun || reconnectPending) return
        reconnectPending = true
        val delay = backoff
        backoff = (backoff * 2).coerceAtMost(MAX_BACKOFF_MS)
        Log.i(TAG, "reconnecting in ${delay}ms")
        main.postDelayed({
            reconnectPending = false
            if (shouldRun) openSocket()
        }, delay)
    }

    private fun handleSocketDeath(reason: String) {
        if (deathHandled) return
        deathHandled = true
        heartbeatHandler.removeCallbacks(heartbeat)
        ws = null
        isConnected = false
        ready = false
        Log.w(TAG, "socket death: $reason")
        if (shouldRun) {
            main.post { listener.onReconnecting() }
            scheduleReconnect()
        } else {
            main.post { listener.onOffline() }
        }
    }

    fun sendText(json: String): Boolean {
        val socket = ws ?: return false
        if (!isConnected) return false
        return try {
            socket.send(json)
        } catch (e: Exception) {
            Log.w(TAG, "send failed: ${e.message}")
            false
        }
    }

    fun sendAudio(bytes: ByteArray, len: Int = bytes.size): Boolean {
        val socket = ws ?: return false
        if (!isConnected) return false
        return try {
            socket.send(bytes.copyOf(len).toByteString())
        } catch (e: Exception) {
            Log.w(TAG, "audio send failed: ${e.message}")
            false
        }
    }

    fun isReady(): Boolean = isConnected && ready

    private val socketListener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            backoff = 800L
            deathHandled = false
            isConnected = true
            webSocket.send(Protocol.hello(
                "rabbit-r1",
                prefs.sessionId,
                prefs.skinId,
                prefs.memoryDeviceId,
                if (prefs.skin == AgentSkin.TARS) prefs.tarsHonesty else null,
                if (prefs.skin == AgentSkin.TARS) prefs.tarsHumor else null,
                if (prefs.skin == AgentSkin.TARS) prefs.tarsSarcasm else null,
            ))
            heartbeatHandler.removeCallbacks(heartbeat)
            heartbeatHandler.postDelayed(heartbeat, HEARTBEAT_MS)
            main.post { listener.onConnected() }
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            wsHandler.post {
                val event = Protocol.parse(text)
                when (event) {
                    is Protocol.ServerEvent.Ready -> {
                        if (event.agentId != null) prefs.agentId = event.agentId
                        ready = true
                        main.post { listener.onReady() }
                    }
                    is Protocol.ServerEvent.Pong -> Unit
                    else -> {}
                }
                main.post { listener.onEvent(event) }
            }
        }

        override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
            val data = bytes.toByteArray()
            wsHandler.post { main.post { listener.onTtsAudio(data) } }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            webSocket.close(1000, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            handleSocketDeath("closed code=$code reason=$reason")
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            handleSocketDeath("failure: ${t.message}")
        }
    }
}
