package tech.glados.r1

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import kotlin.concurrent.thread

/**
 * Microphone capture (16 kHz mono PCM16, streamed up) and speaker playback
 * (streaming AudioTrack for GLaDOS TTS coming down).
 */
class AudioEngine(
    private val context: Context,
    private val captureSampleRate: Int = 16000,
) {

    companion object {
        private const val TAG = "AudioEngine"
        /** R1 hardware plays at 48 kHz — must match server tts_start sampleRate. */
        const val R1_SAMPLE_RATE = 48000
    }

    @Volatile private var recording = false
    private var recordThread: Thread? = null
    private var track: AudioTrack? = null
    private var focusRequest: AudioFocusRequest? = null
    @Volatile private var bytesWritten = 0
    @Volatile private var playbackRate = 22050
    @Volatile private var drainGeneration = 0

    @SuppressLint("MissingPermission")
    fun startRecording(onPcm: (ByteArray, Int) -> Unit, onError: (() -> Unit)? = null) {
        if (recording) return
        val minBuf = AudioRecord.getMinBufferSize(
            captureSampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        ).coerceAtLeast(2048)

        val recorder = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            captureSampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            minBuf * 2,
        )
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord failed to initialize")
            recorder.release()
            onError?.invoke()
            return
        }

        recording = true
        recorder.startRecording()
        recordThread = thread(name = "oko-mic") {
            val buf = ByteArray(minBuf)
            try {
                while (recording) {
                    val n = recorder.read(buf, 0, buf.size)
                    if (n > 0) onPcm(buf.copyOf(n), captureSampleRate)
                }
            } finally {
                try {
                    recorder.stop()
                } catch (_: Exception) {
                }
                recorder.release()
            }
        }
    }

    fun stopRecording() {
        recording = false
        recordThread?.join(1500)
        recordThread = null
    }

    /** Prepare playback — always 48 kHz on R1 (matches backend resample). */
    fun startPlayback(sampleRate: Int) {
        cancelDrain()
        stopPlayback()
        if (sampleRate != R1_SAMPLE_RATE) {
            Log.w(TAG, "tts_start sr=$sampleRate, using R1_SAMPLE_RATE=$R1_SAMPLE_RATE")
        }
        playbackRate = R1_SAMPLE_RATE
        bytesWritten = 0
        requestFocus()

        val minBuf = AudioTrack.getMinBufferSize(
            R1_SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        ).coerceAtLeast(4096)

        val t = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build(),
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(R1_SAMPLE_RATE)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setTransferMode(AudioTrack.MODE_STREAM)
            .setBufferSizeInBytes(minBuf * 8)
            .build()

        if (t.state != AudioTrack.STATE_INITIALIZED) {
            Log.e(TAG, "AudioTrack failed to initialize sr=$R1_SAMPLE_RATE")
            t.release()
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            t.playbackParams = t.playbackParams.setSpeed(1.0f).setPitch(1.0f)
        }
        t.setVolume(1.0f)
        t.play()
        track = t
        Log.i(TAG, "playback started sr=$R1_SAMPLE_RATE buf=${minBuf * 8}")
    }

    fun writePlayback(bytes: ByteArray) {
        val t = track ?: run {
            Log.w(TAG, "writePlayback with no track (${bytes.size} bytes dropped)")
            return
        }
        val written = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            t.write(bytes, 0, bytes.size, AudioTrack.WRITE_BLOCKING)
        } else {
            @Suppress("DEPRECATION")
            t.write(bytes, 0, bytes.size)
        }
        if (written <= 0) {
            Log.e(TAG, "AudioTrack write failed: $written")
            return
        }
        bytesWritten += written
    }

    fun endPlayback() {
        cancelDrain()
        abandonFocus()
        track?.let { t ->
            try {
                t.pause()
                t.flush()
            } catch (_: Exception) {
            }
            try {
                t.release()
            } catch (_: Exception) {
            }
        }
        track = null
        bytesWritten = 0
    }

    /** Stop after queued PCM has had time to play out. */
    fun drainPlayback(onDone: (() -> Unit)? = null) {
        val t = track ?: run {
            onDone?.invoke()
            return
        }
        val generation = ++drainGeneration
        val rate = playbackRate
        val samples = bytesWritten / 2
        val durationMs = if (rate > 0) (samples * 1000L / rate) + 300L else 800L
        thread(name = "oko-drain") {
            try {
                Thread.sleep(durationMs.coerceIn(200, 30_000))
                if (generation != drainGeneration || track !== t) return@thread
                t.stop()
            } catch (_: Exception) {
            }
            if (generation != drainGeneration || track !== t) {
                onDone?.invoke()
                return@thread
            }
            try {
                t.release()
            } catch (_: Exception) {
            }
            if (track === t) track = null
            bytesWritten = 0
            abandonFocus()
            onDone?.invoke()
        }
    }

    private fun cancelDrain() {
        drainGeneration++
    }

    private fun stopPlayback() {
        cancelDrain()
        abandonFocus()
        track?.let {
            try {
                it.pause(); it.flush(); it.release()
            } catch (_: Exception) {
            }
        }
        track = null
        bytesWritten = 0
    }

    private fun requestFocus() {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                .build()
            am.requestAudioFocus(focusRequest!!)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        }
    }

    private fun abandonFocus() {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { am.abandonAudioFocusRequest(it) }
            focusRequest = null
        } else {
            @Suppress("DEPRECATION")
            am.abandonAudioFocus(null)
        }
    }

    fun release() {
        stopRecording()
        stopPlayback()
    }
}
