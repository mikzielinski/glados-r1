package tech.glados.r1

import android.Manifest
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
import android.widget.EditText
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
        client.close()
        audio.release()
        if (wakeLock?.isHeld == true) wakeLock?.release()
        @Suppress("DEPRECATION")
        if (wifiLock?.isHeld == true) wifiLock?.release()
        stopLocationRefresh()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
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

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> { binding.log.scrollByLines(-3); return true }
            KeyEvent.KEYCODE_DPAD_DOWN -> { binding.log.scrollByLines(3); return true }
            KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN,
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_HOME -> return super.onKeyDown(keyCode, event)
        }
        if (isSideButtonPtt(keyCode)) return true
        if (event.repeatCount == 0) startTalking()
        return true
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_VOLUME_UP, KeyEvent.KEYCODE_VOLUME_DOWN,
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_HOME -> return super.onKeyUp(keyCode, event)
        }
        if (isSideButtonPtt(keyCode)) return true
        stopTalking()
        return true
    }

    /** Side button: KEYCODE_F1 after keylayout remap; POWER before remap (rarely reaches app). */
    private fun isSideButtonPtt(keyCode: Int): Boolean =
        keyCode == KeyEvent.KEYCODE_F1 || keyCode == KeyEvent.KEYCODE_POWER

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
        val msg = when {
            ttsActive -> getString(R.string.status_resuming_speech)
            serverBusy || backendState in BUSY_STATES -> getString(R.string.status_resuming_task)
            else -> getString(R.string.status_reconnecting)
        }
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
        forceStopTalking(getString(R.string.status_disconnected))
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
            else -> {}
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
                setStatus(getString(R.string.status_disconnected))
                applyUiState()
            }
        }
        mainHandler.postDelayed(offlineRunnable!!, 12_000)
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

        val skinGroup = view.findViewById<android.widget.RadioGroup>(R.id.skinGroup)
        val tarsTitle = view.findViewById<android.widget.TextView>(R.id.tarsTraitsTitle)
        val tarsPanel = view.findViewById<android.widget.LinearLayout>(R.id.tarsTraitsPanel)
        val honestySeek = view.findViewById<android.widget.SeekBar>(R.id.tarsHonestySeek)
        val humorSeek = view.findViewById<android.widget.SeekBar>(R.id.tarsHumorSeek)
        val sarcasmSeek = view.findViewById<android.widget.SeekBar>(R.id.tarsSarcasmSeek)
        val honestyLabel = view.findViewById<android.widget.TextView>(R.id.tarsHonestyLabel)
        val humorLabel = view.findViewById<android.widget.TextView>(R.id.tarsHumorLabel)
        val sarcasmLabel = view.findViewById<android.widget.TextView>(R.id.tarsSarcasmLabel)

        honestySeek.progress = prefs.tarsHonesty
        humorSeek.progress = prefs.tarsHumor
        sarcasmSeek.progress = prefs.tarsSarcasm

        fun updateTarsLabels() {
            honestyLabel.text = getString(R.string.settings_tars_honesty, honestySeek.progress)
            humorLabel.text = getString(R.string.settings_tars_humor, humorSeek.progress)
            sarcasmLabel.text = getString(R.string.settings_tars_sarcasm, sarcasmSeek.progress)
        }

        fun showTarsPanel(skin: AgentSkin) {
            val visible = skin == AgentSkin.TARS
            val vis = if (visible) android.view.View.VISIBLE else android.view.View.GONE
            tarsTitle.visibility = vis
            tarsPanel.visibility = vis
        }

        when (prefs.skin) {
            AgentSkin.HAL9000 -> view.findViewById<android.widget.RadioButton>(R.id.skinHal).isChecked = true
            AgentSkin.GLADOS -> view.findViewById<android.widget.RadioButton>(R.id.skinGlados).isChecked = true
            AgentSkin.TARS -> view.findViewById<android.widget.RadioButton>(R.id.skinTars).isChecked = true
        }
        updateTarsLabels()
        showTarsPanel(prefs.skin)

        skinGroup.setOnCheckedChangeListener { _, checkedId ->
            val skin = when (checkedId) {
                R.id.skinGlados -> AgentSkin.GLADOS
                R.id.skinTars -> AgentSkin.TARS
                else -> AgentSkin.HAL9000
            }
            showTarsPanel(skin)
        }

        val updateSlider = android.widget.SeekBar.OnSeekBarChangeListener { _, _, _ -> updateTarsLabels() }
        honestySeek.setOnSeekBarChangeListener(updateSlider)
        humorSeek.setOnSeekBarChangeListener(updateSlider)
        sarcasmSeek.setOnSeekBarChangeListener(updateSlider)

        val dialog = AlertDialog.Builder(this)
            .setTitle(getString(R.string.settings_title))
            .setView(view)
            .setPositiveButton(getString(android.R.string.ok)) { _, _ ->
                val skin = when (skinGroup.checkedRadioButtonId) {
                    R.id.skinGlados -> AgentSkin.GLADOS
                    R.id.skinTars -> AgentSkin.TARS
                    else -> AgentSkin.HAL9000
                }
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

        dialog.show()
    }

    companion object {
        private val BUSY_STATES = setOf("thinking", "working", "speaking")
    }
}

private fun android.widget.TextView.scrollByLines(lines: Int) {
    val lineHeight = lineHeight.coerceAtLeast(1)
    val layout = layout ?: return
    val maxScroll = (layout.height - height).coerceAtLeast(0)
    val target = (scrollY + lines * lineHeight).coerceIn(0, maxScroll)
    scrollTo(0, target)
}
