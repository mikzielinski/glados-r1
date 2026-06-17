package tech.glados.r1

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.text.method.ScrollingMovementMethod
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.WindowManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import android.animation.ValueAnimator
import android.view.View
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.SeekBar
import tech.glados.r1.databinding.ActivityMainBinding
import tech.glados.r1.ui.LensView
import java.io.File

/**
 * R1 voice client — OKO design system UI.
 *
 * Hold the lens to talk. Side button also triggers PTT. Scroll wheel scrolls transcript.
 * Long-press the lens to capture a photo for the agent.
 */
class MainActivity : AppCompatActivity(), GladosClient.Listener {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs
    private lateinit var client: GladosClient
    private lateinit var hardware: RabbitHardware
    private val audio = AudioEngine(this, captureSampleRate = 16000)

    private var pttActive = false
    private var pttServerReady = false
    private var hasMic = false
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var offlineRunnable: Runnable? = null
    private var backendState: String? = null
    private var backendDetail: String? = null
    private var connected = false
    private var serverReady = false
    private var serverBusy = false
    private var reconnecting = false
    private val pendingAudio = ArrayList<ByteArray>()
    private var pendingPhotoFile: File? = null
    private var ttsActive = false
    private var ttsPlaybackReady = false
    private val pendingTtsAudio = ArrayList<ByteArray>()
    private var locationRefreshRunnable: Runnable? = null
    private var agentLogLabel = "OKO"
    private var memoryCountLabel: android.widget.TextView? = null
    private var tarsHonestySeekRef: SeekBar? = null
    private var tarsHumorSeekRef: SeekBar? = null
    private var tarsSarcasmSeekRef: SeekBar? = null
    private var tarsHonestyValueRef: android.widget.TextView? = null
    private var tarsHumorValueRef: android.widget.TextView? = null
    private var tarsSarcasmValueRef: android.widget.TextView? = null
    private var tarsHudHideRunnable: Runnable? = null

    private val memoryFilePicker =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri == null) return@registerForActivityResult
            ingestMemoryFile(uri)
        }

    private val micPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            hasMic = granted
            if (!granted) setStatus("${getString(R.string.state_error)} · Brak mikrofonu.")
        }

    private val sensorPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            if (results.values.any { it }) publishDeviceContext()
            else publishDeviceContextQuick()
        }

    private val cameraLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val file = pendingPhotoFile
            pendingPhotoFile = null
            if (result.resultCode != RESULT_OK || file == null) {
                setStatus(getString(R.string.camera_failed))
                return@registerForActivityResult
            }
            val b64 = hardware.encodePhotoFile(file)
            publishDeviceContext(photoBase64 = b64)
            setStatus(getString(R.string.camera_sent))
            appendLog("📷", getString(R.string.camera_sent))
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyKioskWindowFlags()
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = Prefs(this)
        client = GladosClient(prefs, this)
        hardware = RabbitHardware(this)

        binding.log.movementMethod = ScrollingMovementMethod()
        applyAgentSkin(prefs.skin)
        applyWindowInsets()

        hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        if (!hasMic) micPermission.launch(Manifest.permission.RECORD_AUDIO)

        requestSensorPermissions()

        binding.lens.setOnTouchListener { _, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> { startTalking(); true }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> { stopTalking(); true }
                else -> false
            }
        }

        binding.lens.setOnLongClickListener {
            if (!pttActive) capturePhoto()
            true
        }

        binding.settingsButton.setOnClickListener { showSettings() }

        binding.status.setOnClickListener { forceReconnect() }
        binding.hint.setOnClickListener { forceReconnect() }

        // Hardware keys (side button, scroll wheel) need activity focus — not the lens.
        binding.root.isFocusableInTouchMode = true
        binding.root.requestFocus()
        binding.transcriptScroll.isFocusable = false
        binding.lens.isFocusableInTouchMode = false

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "oko:r1")

        @Suppress("DEPRECATION")
        val wm = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL, "oko:wifi")

        applyUiState()
    }

    /** Keep HUD below R1 camera bulge / status inset. */
    private fun applyWindowInsets() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val top = bars.top + (6 * resources.displayMetrics.density).toInt()
            binding.contentColumn.setPadding(0, top, 0, bars.bottom.coerceAtLeast(8))
            insets
        }
        ViewCompat.requestApplyInsets(binding.root)
    }

    override fun onStart() {
        super.onStart()
        wakeLock?.acquire(2 * 60 * 60 * 1000L)
        @Suppress("DEPRECATION")
        if (wifiLock?.isHeld != true) wifiLock?.acquire()
        client.connect()
    }

    override fun onStop() {
        super.onStop()
        forceStopTalking(getString(R.string.status_disconnected))
        if (isFinishing) {
            client.close()
            audio.release()
        } else {
            // Kiosk: pause socket but keep reconnect intent for onResume.
            client.pause()
        }
        if (wakeLock?.isHeld == true) wakeLock?.release()
        @Suppress("DEPRECATION")
        if (wifiLock?.isHeld == true) wifiLock?.release()
        stopLocationRefresh()
    }

    override fun onResume() {
        super.onResume()
        binding.root.requestFocus()
        dismissSystemOverlays()
        client.reconnectNow()
        if (!client.isReady()) {
            resetBackendUiState(clearReconnecting = false)
            setStatus(getString(R.string.status_reconnecting))
            applyUiState()
        }
    }

    override fun onDestroy() {
        client.close()
        try {
            audio.release()
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    private fun dismissSystemOverlays() {
        try {
            @Suppress("DEPRECATION")
            sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
        } catch (_: Exception) {
        }
        try {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                )
        } catch (_: Exception) {
        }
        mainHandler.postDelayed({ collapseStatusBarPanels() }, 500)
    }

    private fun applyKioskWindowFlags() {
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
        )
    }

    private fun collapseStatusBarPanels() {
        try {
            val statusBarService = getSystemService("statusbar") ?: return
            statusBarService.javaClass.getMethod("collapsePanels").invoke(statusBarService)
        } catch (_: Exception) {
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (handleScrollKey(event.keyCode, event.action)) return true
        if (isSideButtonPtt(event.keyCode)) {
            when (event.action) {
                KeyEvent.ACTION_DOWN -> {
                    if (event.repeatCount == 0) startTalking()
                    return true
                }
                KeyEvent.ACTION_UP -> {
                    stopTalking()
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_SCROLL) {
            val delta = event.getAxisValue(MotionEvent.AXIS_SCROLL)
            if (delta != 0f) {
                scrollTranscript(if (delta > 0) -4 else 4)
                return true
            }
        }
        return super.onGenericMotionEvent(event)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (handleScrollKey(keyCode, KeyEvent.ACTION_DOWN)) return true
        if (isSideButtonPtt(keyCode)) return true
        when (keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN,
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_HOME,
            -> return super.onKeyDown(keyCode, event)
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (handleScrollKey(keyCode, KeyEvent.ACTION_UP)) return true
        if (isSideButtonPtt(keyCode)) {
            stopTalking()
            return true
        }
        when (keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN,
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_HOME,
            -> return super.onKeyUp(keyCode, event)
        }
        return super.onKeyUp(keyCode, event)
    }

    /** Scroll wheel / DPAD — scroll the transcript panel, not the inner TextView. */
    private fun handleScrollKey(keyCode: Int, action: Int): Boolean {
        if (action != KeyEvent.ACTION_DOWN) return false
        val lines = when (keyCode) {
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_PAGE_UP,
            KeyEvent.KEYCODE_MEDIA_REWIND,
            -> -4
            KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_PAGE_DOWN,
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD,
            -> 4
            else -> return false
        }
        scrollTranscript(lines)
        return true
    }

    private fun scrollTranscript(lines: Int) {
        val lineHeight = binding.log.lineHeight.coerceAtLeast(1)
        val delta = lines * lineHeight
        binding.transcriptScroll.smoothScrollBy(0, delta)
    }

    /** Side button after keylayout remap (116→F1); POWER rarely reaches apps on CipherOS. */
    private fun isSideButtonPtt(keyCode: Int): Boolean =
        keyCode == KeyEvent.KEYCODE_F1 ||
            keyCode == KeyEvent.KEYCODE_POWER ||
            keyCode == KeyEvent.KEYCODE_CAMERA ||
            keyCode == KeyEvent.KEYCODE_VOICE_ASSIST ||
            keyCode == KeyEvent.KEYCODE_STEM_PRIMARY

    private fun requestSensorPermissions() {
        val needed = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            needed += Manifest.permission.ACCESS_FINE_LOCATION
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            needed += Manifest.permission.ACCESS_COARSE_LOCATION
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            needed += Manifest.permission.CAMERA
        }
        if (needed.isNotEmpty()) sensorPermissions.launch(needed.toTypedArray())
        else publishDeviceContext()
    }

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    private fun deviceSnapshot(location: android.location.Location? = null, photoBase64: String? = null): RabbitHardware.Snapshot {
        val loc = location ?: hardware.lastLocation()
        return RabbitHardware.Snapshot(
            batteryPct = hardware.batteryPct(),
            network = hardware.networkLabel(),
            location = loc,
            locationStatus = hardware.locationStatus(hasLocationPermission()),
            photoBase64 = photoBase64,
        )
    }

    private fun publishDeviceContext(photoBase64: String? = null) {
        if (!client.isReady()) return
        if (!hasLocationPermission()) {
            client.sendText(hardware.toDeviceContextJson(deviceSnapshot(photoBase64 = photoBase64), prefs))
            return
        }
        if (!hardware.isLocationEnabled()) {
            client.sendText(hardware.toDeviceContextJson(deviceSnapshot(photoBase64 = photoBase64), prefs))
            return
        }
        hardware.requestFreshLocation { loc ->
            client.sendText(hardware.toDeviceContextJson(deviceSnapshot(loc, photoBase64), prefs))
        }
    }

    /** Send cached sensor snapshot immediately (no GPS wait). */
    private fun publishDeviceContextQuick() {
        if (!client.isReady()) return
        client.sendText(hardware.toDeviceContextJson(deviceSnapshot(), prefs))
    }

    private fun startLocationRefresh() {
        stopLocationRefresh()
        locationRefreshRunnable = object : Runnable {
            override fun run() {
                if (client.isReady()) publishDeviceContext()
                mainHandler.postDelayed(this, 45_000)
            }
        }
        mainHandler.postDelayed(locationRefreshRunnable!!, 45_000)
    }

    private fun stopLocationRefresh() {
        locationRefreshRunnable?.let { mainHandler.removeCallbacks(it) }
        locationRefreshRunnable = null
    }

    private fun capturePhoto() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            sensorPermissions.launch(arrayOf(Manifest.permission.CAMERA))
            return
        }
        val pair = hardware.buildCameraIntent() ?: run {
            setStatus(getString(R.string.camera_failed))
            return
        }
        pendingPhotoFile = pair.second
        cameraLauncher.launch(pair.first)
    }

    private fun startTalking() {
        if (pttActive) return
        publishDeviceContextQuick()
        if (!client.isReady()) {
            setStatus(
                if (connected) getString(R.string.status_connecting)
                else getString(R.string.status_reconnecting),
            )
            return
        }
        if (serverBusy && !canInterruptPtt()) {
            setStatus(getString(R.string.status_busy))
            return
        }
        if (!hasMic) {
            micPermission.launch(Manifest.permission.RECORD_AUDIO)
            return
        }

        pttActive = true
        pttServerReady = false
        pendingAudio.clear()
        binding.lens.isLongClickable = false
        applyUiState()

        if (!client.sendText(Protocol.pttStart(16000))) {
            forceStopTalking(getString(R.string.status_reconnecting))
            return
        }

        audio.startRecording(
            onPcm = { pcm, _ ->
                if (pttServerReady) client.sendAudio(pcm)
                else pendingAudio.add(pcm)
            },
            onError = {
                runOnUiThread {
                    forceStopTalking(getString(R.string.mic_failed))
                }
            },
        )

        // Fallback: if server doesn't ack quickly, still stream after 400ms.
        mainHandler.postDelayed({
            if (pttActive && !pttServerReady) onPttReady()
        }, 400)
    }

    private fun stopTalking() {
        if (!pttActive) return
        pttActive = false
        pttServerReady = false
        binding.lens.isLongClickable = true
        applyUiState()
        audio.stopRecording()
        flushPendingAudio()
        client.sendText(Protocol.pttEnd())
        pendingAudio.clear()
    }

    private fun forceStopTalking(message: String) {
        if (pttActive) {
            pttActive = false
            pttServerReady = false
            binding.lens.isLongClickable = true
            audio.stopRecording()
            pendingAudio.clear()
            applyUiState()
        }
        setStatus(message)
    }

    private fun onPttReady() {
        pttServerReady = true
        flushPendingAudio()
    }

    private fun flushPendingAudio() {
        for (chunk in pendingAudio) client.sendAudio(chunk)
        pendingAudio.clear()
    }

    override fun onConnected() {
        connected = true
        cancelOfflineTimer()
        setStatus(getString(R.string.status_connecting))
    }

    override fun onReady() {
        serverReady = true
        reconnecting = false
        cancelOfflineTimer()
        // Server will push status / replay TTS — avoid flashing GOTOWA too early.
        if (!serverBusy && backendState != "speaking" && backendState != "working" && backendState != "thinking") {
            setStatus(getString(R.string.status_ready))
        }
        publishDeviceContext()
        startLocationRefresh()
    }

    override fun onReconnecting() {
        connected = false
        serverReady = false
        reconnecting = true
        resetBackendUiState(clearReconnecting = false)
        val msg = getString(R.string.status_reconnecting)
        if (pttActive) forceStopTalking(msg) else binding.status.text = msg
        applyUiState()
        scheduleOfflineTimer()
    }

    override fun onOffline() {
        connected = false
        serverReady = false
        serverBusy = false
        reconnecting = false
        cancelOfflineTimer()
        resetBackendUiState(clearReconnecting = true)
        forceStopTalking(getString(R.string.status_disconnected))
    }

    /** Drop stale busy/thinking UI when backend/Mac is unreachable. */
    private fun resetBackendUiState(clearReconnecting: Boolean) {
        if (clearReconnecting) reconnecting = false
        backendState = null
        backendDetail = null
        serverBusy = false
        ttsActive = false
        ttsPlaybackReady = false
        pendingTtsAudio.clear()
        try {
            audio.endPlayback()
        } catch (_: Exception) {
        }
    }

    private fun forceReconnect() {
        resetBackendUiState(clearReconnecting = false)
        reconnecting = true
        setStatus(getString(R.string.status_reconnecting))
        applyUiState()
        client.reconnectNow()
    }

    override fun onEvent(event: Protocol.ServerEvent) {
        when (event) {
            is Protocol.ServerEvent.Ready -> Unit // handled in onReady()
            is Protocol.ServerEvent.Status -> {
                backendState = event.state
                backendDetail = event.detail
                serverBusy = event.state in BUSY_STATES
                setStatus(stateLabel(event.state, event.detail))
                if (event.state == "listening") onPttReady()
            }
            is Protocol.ServerEvent.PttAck -> onPttReady()
            is Protocol.ServerEvent.PttRejected -> {
                forceStopTalking(event.reason)
                appendLog("!", event.reason)
            }
            is Protocol.ServerEvent.Transcript -> appendLog(getString(R.string.log_you), event.text)
            is Protocol.ServerEvent.AssistantText ->
                appendLog(
                    agentLogLabel,
                    if (event.final) event.text else "↻ ${event.text}",
                )
            is Protocol.ServerEvent.TtsStart -> {
                backendState = "speaking"
                serverBusy = true
                ttsActive = true
                reconnecting = false
                applyUiState()
                ttsPlaybackReady = false
                val queued = pendingTtsAudio.toList()
                pendingTtsAudio.clear()
                audio.endPlayback()
                audio.startPlayback(event.sampleRate)
                ttsPlaybackReady = true
                for (chunk in queued) audio.writePlayback(chunk)
            }
            is Protocol.ServerEvent.TtsEnd -> {
                ttsActive = false
                ttsPlaybackReady = false
                serverBusy = false
                pendingTtsAudio.clear()
                if (!reconnecting) {
                    audio.drainPlayback {
                        mainHandler.post {
                            backendState = if (connected) "idle" else null
                            setStatus(getString(R.string.status_ready))
                            applyUiState()
                        }
                    }
                } else {
                    applyUiState()
                }
            }
            is Protocol.ServerEvent.SessionReset -> {
                binding.log.text = ""
                setStatus(getString(R.string.settings_session_cleared))
            }
            is Protocol.ServerEvent.Err -> {
                appendLog("!", event.message)
                setStatus(event.message)
            }
            is Protocol.ServerEvent.MemoryStatus -> {
                memoryCountLabel?.text = getString(R.string.settings_memory_count, event.count)
            }
            is Protocol.ServerEvent.MemoryLearned -> {
                memoryCountLabel?.text = getString(R.string.settings_memory_count, event.count)
                setStatus(getString(R.string.settings_memory_learn_ok, event.count))
            }
            is Protocol.ServerEvent.TarsTraitsUpdated -> onTarsTraitsUpdated(event)
            else -> {}
        }
    }

    private fun ingestMemoryFile(uri: Uri) {
        try {
            val name = contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0 && cursor.moveToFirst()) cursor.getString(idx) else null
            } ?: "upload.bin"
            val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw IllegalStateException("Nie można odczytać pliku")
            if (bytes.isEmpty()) throw IllegalStateException("Plik jest pusty")
            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            if (!client.sendText(Protocol.memoryUpload(name, b64, force = true))) {
                setStatus(getString(R.string.status_disconnected))
            } else {
                setStatus(getString(R.string.settings_memory_upload_ok, name))
            }
        } catch (e: Exception) {
            setStatus(e.message ?: "Błąd wczytywania pliku")
        }
    }

    override fun onTtsAudio(bytes: ByteArray) {
        if (!ttsPlaybackReady) {
            pendingTtsAudio.add(bytes)
            return
        }
        audio.writePlayback(bytes)
    }

    private fun stateLabel(state: String, detail: String?): String = when (state) {
        "listening" -> getString(R.string.state_listening)
        "thinking" -> getString(R.string.state_thinking) + (detail?.let { " · $it" } ?: "")
        "working" -> getString(R.string.state_working)
        "speaking" -> getString(R.string.state_speaking) + (
            if (detail == "resuming") " · ${getString(R.string.state_resuming)}" else ""
        )
        "error" -> getString(R.string.state_error)
        else -> getString(R.string.state_ready)
    }

    private fun sysbarStateLabel(): String = when {
        reconnecting && !serverReady -> getString(R.string.state_reconnecting)
        !connected && !serverReady -> getString(R.string.state_offline)
        pttActive -> getString(R.string.state_listening)
        backendState == "thinking" -> getString(R.string.state_thinking)
        backendState == "working" -> getString(R.string.state_working)
        backendState == "speaking" -> getString(R.string.state_speaking)
        backendState == "error" -> getString(R.string.state_error)
        serverBusy -> getString(R.string.state_thinking)
        else -> getString(R.string.state_ready)
    }

    private fun lensState(): LensView.State = when {
        !connected && !reconnecting -> LensView.State.OFFLINE
        reconnecting && !serverReady -> LensView.State.IDLE
        !serverReady -> LensView.State.IDLE
        pttActive || backendState == "listening" -> LensView.State.LISTENING
        backendState == "thinking" || backendState == "working" || serverBusy -> LensView.State.THINKING
        backendState == "speaking" -> LensView.State.SPEAKING
        backendState == "error" -> LensView.State.ALERT
        else -> LensView.State.IDLE
    }

    private fun applyUiState() {
        binding.sysbarState.text = "· ${sysbarStateLabel()}"
        binding.lens.lensState = lensState()
        binding.waveform.setActive(
            pttActive || backendState == "listening" || backendState == "speaking",
        )
        binding.sysbarDot.setBackgroundResource(
            when {
                !connected || !serverReady -> R.drawable.sysbar_dot_idle
                backendState == "error" -> R.drawable.sysbar_dot_active
                connected -> R.drawable.sysbar_dot_ok
                else -> R.drawable.sysbar_dot_idle
            }
        )
        binding.hint.text = when {
            !connected && !client.isReady() -> getString(R.string.hint_offline)
            pttActive -> getString(R.string.ptt_listening)
            backendState == "working" -> getString(R.string.hint_busy_interrupt)
            serverBusy -> getString(R.string.hint_busy)
            else -> getString(R.string.hint_ptt)
        }
    }

    private fun setStatus(text: String) {
        binding.status.text = text
        applyUiState()
    }

    private fun appendLog(speaker: String, text: String) {
        val line = "$speaker: $text"
        binding.log.append(if (binding.log.text.isEmpty()) line else "\n$line")
        binding.log.post {
            binding.transcriptScroll.fullScroll(android.view.View.FOCUS_DOWN)
        }
    }

    private fun scheduleOfflineTimer() {
        cancelOfflineTimer()
        offlineRunnable = Runnable {
            if (!client.isReady()) {
                setStatus(getString(R.string.status_offline_hint))
                applyUiState()
                client.reconnectNow()
            }
        }
        mainHandler.postDelayed(offlineRunnable!!, 15_000)
    }

    private fun cancelOfflineTimer() {
        offlineRunnable?.let { mainHandler.removeCallbacks(it) }
        offlineRunnable = null
    }

    private fun backendHostLabel(url: String): String {
        val stripped = url.removePrefix("ws://").removePrefix("wss://")
        return stripped.substringBefore("/").substringBefore(":")
    }

    /** PTT while a cloud agent run is active — used to say "przerwij". */
    private fun canInterruptPtt(): Boolean =
        backendState == "working" ||
            (backendState == "thinking" && backendDetail == "cloud")

    private fun applyAgentSkin(skin: AgentSkin) {
        val tokens = SkinCatalog.tokens(skin, this)
        agentLogLabel = tokens.logLabel
        binding.brandLabel.text = tokens.brandName
        SkinCatalog.apply(binding, tokens)
    }

    private fun showSettings() {
        val view = layoutInflater.inflate(R.layout.dialog_settings, null)
        val urlInput = view.findViewById<EditText>(R.id.backendUrlInput)
        urlInput.setText(prefs.backendUrl)

        val skinSpinner = view.findViewById<android.widget.Spinner>(R.id.skinSpinner)
        val skinLabels = AgentSkin.entries.map { SkinCatalog.tokens(it, this).settingsLabel }
        val skinAdapter = android.widget.ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            skinLabels,
        ).also { it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
        skinSpinner.adapter = skinAdapter
        skinSpinner.setSelection(AgentSkin.entries.indexOf(prefs.skin).coerceAtLeast(0))
        val tarsTitle = view.findViewById<android.widget.TextView>(R.id.tarsTraitsTitle)
        val tarsPanel = view.findViewById<android.widget.LinearLayout>(R.id.tarsTraitsPanel)
        val honestySeek = view.findViewById<android.widget.SeekBar>(R.id.tarsHonestySeek)
        val humorSeek = view.findViewById<android.widget.SeekBar>(R.id.tarsHumorSeek)
        val sarcasmSeek = view.findViewById<android.widget.SeekBar>(R.id.tarsSarcasmSeek)
        val honestyValue = view.findViewById<android.widget.TextView>(R.id.tarsHonestyValue)
        val humorValue = view.findViewById<android.widget.TextView>(R.id.tarsHumorValue)
        val sarcasmValue = view.findViewById<android.widget.TextView>(R.id.tarsSarcasmValue)

        honestySeek.progress = prefs.tarsHonesty
        humorSeek.progress = prefs.tarsHumor
        sarcasmSeek.progress = prefs.tarsSarcasm

        fun updateTarsLabels() {
            honestyValue.text = getString(R.string.settings_tars_trait_value, honestySeek.progress)
            humorValue.text = getString(R.string.settings_tars_trait_value, humorSeek.progress)
            sarcasmValue.text = getString(R.string.settings_tars_trait_value, sarcasmSeek.progress)
        }

        fun showTarsPanel(skin: AgentSkin) {
            val visible = skin == AgentSkin.TARS
            val vis = if (visible) android.view.View.VISIBLE else android.view.View.GONE
            tarsTitle.visibility = vis
            tarsPanel.visibility = vis
        }

        showTarsPanel(prefs.skin)
        updateTarsLabels()

        skinSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, v: android.view.View?, position: Int, id: Long) {
                showTarsPanel(AgentSkin.entries[position])
            }
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
        }

        val updateSlider = object : android.widget.SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: android.widget.SeekBar?, progress: Int, fromUser: Boolean) {
                updateTarsLabels()
            }
            override fun onStartTrackingTouch(seekBar: android.widget.SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: android.widget.SeekBar?) {}
        }
        honestySeek.setOnSeekBarChangeListener(updateSlider)
        humorSeek.setOnSeekBarChangeListener(updateSlider)
        sarcasmSeek.setOnSeekBarChangeListener(updateSlider)

        val memoryCount = view.findViewById<android.widget.TextView>(R.id.memoryCountLabel)
        val memoryNoteInput = view.findViewById<EditText>(R.id.memoryNoteInput)
        memoryCountLabel = memoryCount
        memoryCount.text = getString(R.string.settings_memory_count, 0)
        if (client.isConnected) client.sendText(Protocol.memoryList())

        tarsHonestySeekRef = honestySeek
        tarsHumorSeekRef = humorSeek
        tarsSarcasmSeekRef = sarcasmSeek
        tarsHonestyValueRef = honestyValue
        tarsHumorValueRef = humorValue
        tarsSarcasmValueRef = sarcasmValue

        view.findViewById<android.widget.Button>(R.id.memoryLearnButton).setOnClickListener {
            val text = memoryNoteInput.text.toString().trim()
            if (text.isEmpty()) {
                setStatus(getString(R.string.settings_memory_hint))
                return@setOnClickListener
            }
            client.sendText(Protocol.memoryLearn(text, force = true))
            memoryNoteInput.text.clear()
        }

        view.findViewById<android.widget.Button>(R.id.memoryUploadButton).setOnClickListener {
            memoryFilePicker.launch(arrayOf("application/pdf", "text/plain", "text/markdown"))
        }

        view.findViewById<android.widget.Button>(R.id.memoryForceButton).setOnClickListener {
            client.sendText(Protocol.textInput("wymuś naukę"))
        }

        view.findViewById<android.widget.Button>(R.id.memoryClearButton).setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(getString(R.string.settings_memory_clear))
                .setMessage(getString(R.string.settings_memory_clear_confirm))
                .setPositiveButton(getString(R.string.settings_memory_clear)) { _, _ ->
                    client.sendText(Protocol.memoryClear("device"))
                }
                .setNeutralButton(getString(R.string.settings_memory_clear_all)) { _, _ ->
                    AlertDialog.Builder(this)
                        .setTitle(getString(R.string.settings_memory_clear_all))
                        .setMessage(getString(R.string.settings_memory_clear_all_confirm))
                        .setPositiveButton(getString(R.string.settings_memory_clear_all)) { _, _ ->
                            client.sendText(Protocol.memoryClear("all"))
                        }
                        .setNegativeButton(getString(android.R.string.cancel), null)
                        .show()
                }
                .setNegativeButton(getString(android.R.string.cancel), null)
                .show()
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(getString(R.string.settings_title))
            .setView(view)
            .setPositiveButton(getString(android.R.string.ok)) { _, _ ->
                val skin = AgentSkin.entries[skinSpinner.selectedItemPosition]
                prefs.skinId = skin.id
                prefs.tarsHonesty = honestySeek.progress
                prefs.tarsHumor = humorSeek.progress
                prefs.tarsSarcasm = sarcasmSeek.progress
                prefs.backendUrl = urlInput.text.toString().trim().ifEmpty { Prefs.DEFAULT_URL }
                applyAgentSkin(skin)
                setStatus(getString(R.string.settings_saved))
                client.close()
                client.connect()
            }
            .setNegativeButton(getString(android.R.string.cancel), null)
            .create()

        view.findViewById<android.widget.Button>(R.id.newSessionButton).setOnClickListener {
            prefs.resetSession()
            binding.log.text = ""
            client.sendText(Protocol.resetSession())
            setStatus(getString(R.string.settings_session_cleared))
            dialog.dismiss()
            client.close()
            client.connect()
        }

        dialog.setOnDismissListener {
            memoryCountLabel = null
            tarsHonestySeekRef = null
            tarsHumorSeekRef = null
            tarsSarcasmSeekRef = null
            tarsHonestyValueRef = null
            tarsHumorValueRef = null
            tarsSarcasmValueRef = null
        }

        dialog.show()
    }

    private fun onTarsTraitsUpdated(event: Protocol.ServerEvent.TarsTraitsUpdated) {
        prefs.tarsHonesty = event.honesty
        prefs.tarsHumor = event.humor
        prefs.tarsSarcasm = event.sarcasm

        tarsHonestySeekRef?.progress = event.honesty
        tarsHumorSeekRef?.progress = event.humor
        tarsSarcasmSeekRef?.progress = event.sarcasm
        tarsHonestyValueRef?.text = getString(R.string.settings_tars_trait_value, event.honesty)
        tarsHumorValueRef?.text = getString(R.string.settings_tars_trait_value, event.humor)
        tarsSarcasmValueRef?.text = getString(R.string.settings_tars_trait_value, event.sarcasm)

        showTarsTraitsHud(event)
    }

    private fun showTarsTraitsHud(event: Protocol.ServerEvent.TarsTraitsUpdated) {
        val root = findViewById<View>(R.id.tarsTraitsHudRoot) ?: return
        val honestyBar = findViewById<ProgressBar>(R.id.tarsHudHonestyBar)
        val humorBar = findViewById<ProgressBar>(R.id.tarsHudHumorBar)
        val sarcasmBar = findViewById<ProgressBar>(R.id.tarsHudSarcasmBar)
        val honestyLabel = findViewById<android.widget.TextView>(R.id.tarsHudHonestyLabel)
        val humorLabel = findViewById<android.widget.TextView>(R.id.tarsHudHumorLabel)
        val sarcasmLabel = findViewById<android.widget.TextView>(R.id.tarsHudSarcasmLabel)
        val changedLabel = findViewById<android.widget.TextView>(R.id.tarsHudChanged)

        honestyLabel.text = getString(R.string.settings_tars_honesty, event.honesty)
        humorLabel.text = getString(R.string.settings_tars_humor, event.humor)
        sarcasmLabel.text = getString(R.string.settings_tars_sarcasm, event.sarcasm)

        changedLabel.text = when (event.changed) {
            "honesty" -> getString(R.string.tars_hud_changed_honesty, event.from, event.to)
            "humor" -> getString(R.string.tars_hud_changed_humor, event.from, event.to)
            "sarcasm" -> getString(R.string.tars_hud_changed_sarcasm, event.from, event.to)
            else -> ""
        }

        animateTraitBar(
            honestyBar,
            if (event.changed == "honesty") event.from else honestyBar.progress,
            event.honesty,
        )
        animateTraitBar(
            humorBar,
            if (event.changed == "humor") event.from else humorBar.progress,
            event.humor,
        )
        animateTraitBar(
            sarcasmBar,
            if (event.changed == "sarcasm") event.from else sarcasmBar.progress,
            event.sarcasm,
        )

        tarsHudHideRunnable?.let { mainHandler.removeCallbacks(it) }
        root.animate().cancel()
        root.alpha = 0f
        root.visibility = View.VISIBLE
        root.animate().alpha(1f).setDuration(220).start()
        tarsHudHideRunnable = Runnable {
            root.animate()
                .alpha(0f)
                .setDuration(420)
                .withEndAction { root.visibility = View.GONE }
                .start()
        }
        mainHandler.postDelayed(tarsHudHideRunnable!!, 3600)
    }

    private fun animateTraitBar(
        bar: ProgressBar,
        from: Int,
        to: Int,
    ) {
        if (from == to) {
            bar.progress = to
            return
        }
        ValueAnimator.ofInt(from.coerceIn(0, 100), to.coerceIn(0, 100)).apply {
            duration = 720
            addUpdateListener { anim ->
                bar.progress = anim.animatedValue as Int
            }
            start()
        }
    }

    companion object {
        private val BUSY_STATES = setOf("thinking", "working", "speaking")
    }
}
