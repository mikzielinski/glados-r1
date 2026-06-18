package tech.glados.r1

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.PowerManager

/**
 * Side button after keylayout remap (POWER → F1):
 * - short hold → PTT (handled in MainActivity)
 * - long hold → lock screen (sleep)
 */
object SideButtonPower {
    const val LONG_PRESS_MS = 2800L
    const val WAKE_DEBOUNCE_MS = 700L

    fun adminComponent(context: Context): ComponentName =
        ComponentName(context, OkoDeviceAdmin::class.java)

    fun isAdminActive(context: Context): Boolean {
        val dpm = context.getSystemService(DevicePolicyManager::class.java) ?: return false
        return dpm.isAdminActive(adminComponent(context))
    }

    fun requestAdmin(context: Context) {
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent(context))
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                context.getString(R.string.settings_device_admin_why),
            )
        }
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun lockScreen(context: Context): Boolean {
        val dpm = context.getSystemService(DevicePolicyManager::class.java) ?: return false
        val admin = adminComponent(context)
        if (!dpm.isAdminActive(admin)) return false
        dpm.lockNow()
        return true
    }

    fun isScreenOn(context: Context): Boolean {
        val pm = context.getSystemService(PowerManager::class.java) ?: return true
        return pm.isInteractive
    }
}
