package tech.glados.r1

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.util.Log
import java.util.Locale

/**
 * Fallback when backend is unreachable: Android STT + TTS for basic device queries.
 * No LLM — battery, network, greeting, backend status only.
 */
class LocalVoiceHandler(
    private val context: Context,
    private val hardware: RabbitHardware,
    private val prefs: Prefs,
    private val onStatus: (String) -> Unit,
    private val onLog: (String, String) -> Unit,
) {
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var listening = false

    fun isListening(): Boolean = listening

    fun ensureTts(onReady: () -> Unit = {}) {
        if (ttsReady) {
            onReady()
            return
        }
        tts?.shutdown()
        tts = TextToSpeech(context) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                tts?.language = if (prefs.isEnglishConversation) Locale.US else Locale("pl", "PL")
                onReady()
            }
        }
    }

    fun startListening(): Boolean {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onStatus(context.getString(R.string.local_voice_no_stt))
            return false
        }
        if (listening) return true
        ensureTts()
        listening = true
        onStatus(context.getString(R.string.local_voice_listening))

        if (speechRecognizer == null) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(recognitionListener)
            }
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, if (prefs.isEnglishConversation) "en-US" else "pl-PL")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        try {
            speechRecognizer?.startListening(intent)
            return true
        } catch (e: Exception) {
            Log.e(TAG, "startListening failed", e)
            listening = false
            onStatus(context.getString(R.string.local_voice_no_stt))
            return false
        }
    }

    fun stopListening() {
        if (!listening) return
        listening = false
        try {
            speechRecognizer?.stopListening()
        } catch (_: Exception) {
        }
    }

    fun release() {
        stopListening()
        speechRecognizer?.destroy()
        speechRecognizer = null
        tts?.shutdown()
        tts = null
        ttsReady = false
    }

    private fun reply(text: String, transcript: String) {
        onLog(context.getString(R.string.log_you), transcript)
        onLog(SkinCatalog.tokens(prefs.skin, context).logLabel, text)
        onStatus(context.getString(R.string.local_voice_speaking))
        ensureTts {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "local-${System.currentTimeMillis()}")
            mainHandler.postDelayed({
                onStatus(context.getString(R.string.local_voice_ready))
            }, (text.length * 55L).coerceIn(1500, 8000))
        }
    }

    private val recognitionListener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {
            listening = false
        }

        override fun onError(error: Int) {
            listening = false
            val msg = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH -> if (prefs.isEnglishConversation) {
                    context.getString(R.string.local_voice_no_match_en)
                } else {
                    context.getString(R.string.local_voice_no_match)
                }
                SpeechRecognizer.ERROR_NETWORK -> context.getString(R.string.local_voice_no_stt)
                else -> context.getString(R.string.local_voice_error)
            }
            onStatus(msg)
        }

        override fun onResults(results: Bundle?) {
            listening = false
            val transcript = results
                ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                ?.firstOrNull()
                ?.trim()
                .orEmpty()
            if (transcript.isEmpty()) {
                onStatus(context.getString(R.string.local_voice_no_match))
                return
            }
            val answer = matchLocalReply(transcript) ?: if (prefs.isEnglishConversation) {
                context.getString(R.string.local_voice_need_backend_en)
            } else {
                context.getString(R.string.local_voice_need_backend)
            }
            reply(answer, transcript)
        }

        override fun onPartialResults(partialResults: Bundle?) {}
        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    private fun matchLocalReply(transcript: String): String? {
        val t = transcript.lowercase()
        val snap = hardware.snapshotForLocal()
        val skin = SkinCatalog.tokens(prefs.skin, context).brandName

        if (matches(t, listOf("bateria", "baterii", "naładow", "naladow", "procent", "power", "battery"))) {
            return snap.batteryPct?.let { pct ->
                if (prefs.isEnglishConversation) {
                    context.getString(R.string.local_voice_battery_en, pct)
                } else {
                    context.getString(R.string.local_voice_battery, pct)
                }
            } ?: if (prefs.isEnglishConversation) {
                context.getString(R.string.local_voice_battery_unknown_en)
            } else {
                context.getString(R.string.local_voice_battery_unknown)
            }
        }
        if (matches(t, listOf("wifi", "sieć", "siec", "internet", "online", "offline", "połączen", "polaczen", "network"))) {
            return if (prefs.isEnglishConversation) {
                context.getString(R.string.local_voice_network_en, snap.networkLabel)
            } else {
                context.getString(R.string.local_voice_network, snap.networkLabel)
            }
        }
        if (matches(t, listOf("cześć", "czesc", "hej", "hello", "witaj", "halo", "hi"))) {
            return if (prefs.isEnglishConversation) {
                context.getString(R.string.local_voice_greeting_en, skin)
            } else {
                context.getString(R.string.local_voice_greeting, skin)
            }
        }
        if (matches(t, listOf("backend", "serwer", "mac", "status", "połącz", "polacz", "gotow", "server"))) {
            return if (prefs.isEnglishConversation) {
                context.getString(R.string.local_voice_backend_down_en)
            } else {
                context.getString(R.string.local_voice_backend_down)
            }
        }
        if (matches(t, listOf("kim jesteś", "kim jestes", "who are you", "kto to"))) {
            return if (prefs.isEnglishConversation) {
                context.getString(R.string.local_voice_personality_en, skin)
            } else {
                context.getString(R.string.local_voice_personality, skin)
            }
        }
        return null
    }

    private fun matches(text: String, keywords: List<String>): Boolean =
        keywords.any { text.contains(it) }

    companion object {
        private const val TAG = "LocalVoice"
        private val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
    }
}
