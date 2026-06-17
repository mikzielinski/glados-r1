package tech.glados.r1

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service started from [BootReceiver]. Android 14 blocks background
 * activity launches from broadcast receivers; a visible FGS can start MainActivity.
 */
class BootLaunchService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var attempt = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        attempt = 0
        ensureChannel()
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        handler.postDelayed({ tryLaunch() }, LAUNCH_DELAY_MS)
        return START_NOT_STICKY
    }

    private fun tryLaunch() {
        attempt++
        try {
            startActivity(mainLaunchIntent(this))
            Log.i(TAG, "MainActivity launched (attempt $attempt)")
            stopServiceGracefully()
        } catch (e: Exception) {
            Log.e(TAG, "launch attempt $attempt failed", e)
            if (attempt < MAX_ATTEMPTS) {
                handler.postDelayed({ tryLaunch() }, RETRY_DELAY_MS)
            } else {
                stopServiceGracefully()
            }
        }
    }

    private fun stopServiceGracefully() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.boot_launch_channel),
            NotificationManager.IMPORTANCE_LOW,
        )
        nm.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.boot_launch_notification))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    companion object {
        private const val TAG = "BootLaunchService"
        private const val CHANNEL_ID = "boot_launch"
        private const val NOTIFICATION_ID = 7701
        private const val LAUNCH_DELAY_MS = 3_000L
        private const val RETRY_DELAY_MS = 4_000L
        private const val MAX_ATTEMPTS = 4

        fun mainLaunchIntent(context: Context): Intent =
            Intent(context, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP,
                )
            }

        fun start(context: Context) {
            val intent = Intent(context, BootLaunchService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
