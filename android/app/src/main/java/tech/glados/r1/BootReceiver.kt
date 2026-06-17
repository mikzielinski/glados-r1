package tech.glados.r1

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Launch OKO after CipherOS boot (R1 kiosk). */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            -> {
                Log.i(TAG, "boot completed — starting BootLaunchService")
                BootLaunchService.start(context.applicationContext)
            }
        }
    }

    companion object {
        private const val TAG = "GladosBootReceiver"
    }
}
