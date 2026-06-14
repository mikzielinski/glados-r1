package tech.glados.r1

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.location.LocationRequest
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.util.Log
import androidx.core.content.FileProvider
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.min

/** Rabbit R1 device sensors: GPS, battery, network, camera snapshot. */
class RabbitHardware(private val context: Context) {

    data class Snapshot(
        val batteryPct: Int?,
        val network: String?,
        val location: Location?,
        val locationStatus: String? = null,
        val photoBase64: String? = null,
    )

    companion object {
        private const val TAG = "RabbitHardware"
        private const val PHOTO_MAX_PX = 640
    }

    private val locationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    private val locPrefs = context.getSharedPreferences("glados_location", Context.MODE_PRIVATE)
    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile
    private var cachedLocation: Location? = loadPersistedLocation()
    private var activeListener: LocationListener? = null
    private var activeTimeout: Runnable? = null
    private var activePoll: Runnable? = null

    init {
        cachedLocation?.let {
            Log.i(TAG, "restored cached location age=${(System.currentTimeMillis() - it.time) / 1000}s")
        }
    }

    fun batteryPct(): Int? {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).takeIf { it in 0..100 }
    }

    fun networkLabel(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return "offline"
        val caps = cm.getNetworkCapabilities(net) ?: return "unknown"
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "lte"
            else -> "online"
        }
    }

    fun isLocationEnabled(): Boolean =
        locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

    fun openLocationSettings() {
        context.startActivity(
            Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    @SuppressLint("MissingPermission")
    fun lastLocation(): Location? {
        val providers = listOf(
            LocationManager.FUSED_PROVIDER,
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER,
        )
        val best = providers.mapNotNull { p ->
            try {
                locationManager.getLastKnownLocation(p)
            } catch (_: SecurityException) {
                null
            } catch (_: IllegalArgumentException) {
                null
            }
        }.maxByOrNull { it.time }
        if (best != null) cachedLocation = best
        return best ?: cachedLocation
    }

    fun locationStatus(hasPermission: Boolean): String = when {
        !hasPermission -> "denied"
        !isLocationEnabled() -> "disabled"
        lastLocation() != null -> "ok"
        else -> "no_fix"
    }

    private fun loadPersistedLocation(): Location? {
        if (!locPrefs.contains("lat")) return null
        return Location("cached").apply {
            latitude = locPrefs.getString("lat", null)?.toDoubleOrNull() ?: return null
            longitude = locPrefs.getString("lon", null)?.toDoubleOrNull() ?: return null
            accuracy = locPrefs.getFloat("acc", 0f)
            time = locPrefs.getLong("time", 0L)
        }
    }

    private fun persistLocation(loc: Location) {
        cachedLocation = loc
        locPrefs.edit()
            .putString("lat", loc.latitude.toString())
            .putString("lon", loc.longitude.toString())
            .putFloat("acc", loc.accuracy)
            .putLong("time", loc.time)
            .apply()
    }

    @SuppressLint("MissingPermission")
    fun requestFreshLocation(timeoutMs: Long = 35_000, onResult: (Location?) -> Unit) {
        cancelActiveLocationRequest()

        var done = false

        fun cleanup() {
            activeListener?.let {
                try {
                    locationManager.removeUpdates(it)
                } catch (_: Exception) {
                }
            }
            activeListener = null
            activeTimeout?.let { mainHandler.removeCallbacks(it) }
            activeTimeout = null
            activePoll?.let { mainHandler.removeCallbacks(it) }
            activePoll = null
        }

        fun finish(loc: Location?) {
            if (done) return
            done = true
            cleanup()
            val resolved = loc ?: lastLocation()
            if (resolved != null) persistLocation(resolved)
            mainHandler.post {
                Log.i(
                    TAG,
                    if (resolved != null) {
                        "location ready lat=${resolved.latitude} lon=${resolved.longitude}"
                    } else {
                        "location unavailable after ${timeoutMs}ms"
                    },
                )
                onResult(resolved)
            }
        }

        val providers = buildList {
            try {
                if (locationManager.isProviderEnabled(LocationManager.FUSED_PROVIDER)) {
                    add(LocationManager.FUSED_PROVIDER)
                }
            } catch (_: Exception) {
            }
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                add(LocationManager.GPS_PROVIDER)
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                add(LocationManager.NETWORK_PROVIDER)
            }
        }

        if (providers.isEmpty()) {
            Log.w(TAG, "location providers disabled")
            finish(null)
            return
        }

        lastLocation()?.let { cached ->
            Log.i(TAG, "location cache hit age=${(System.currentTimeMillis() - cached.time) / 1000}s")
        }

        val locationRequest = LocationRequest.Builder(1000L)
            .setMinUpdateIntervalMillis(500L)
            .setQuality(LocationRequest.QUALITY_HIGH_ACCURACY)
            .setMaxUpdates(5)
            .build()

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                Log.i(TAG, "onLocationChanged lat=${location.latitude} lon=${location.longitude}")
                finish(location)
            }
        }
        activeListener = listener

        for (provider in providers) {
            try {
                locationManager.requestLocationUpdates(
                    provider,
                    locationRequest,
                    context.mainExecutor,
                    listener,
                )
            } catch (e: Exception) {
                Log.w(TAG, "requestLocationUpdates($provider): ${e.message}")
            }
        }

        // Backup poll — MTK GNSS on R1 updates system cache without app callbacks.
        var polls = 0
        val maxPolls = (timeoutMs / 2000L).toInt().coerceAtLeast(1)
        val pollRunnable = object : Runnable {
            override fun run() {
                if (done) return
                polls += 1
                val fresh = lastLocation()
                if (fresh != null && System.currentTimeMillis() - fresh.time < 120_000) {
                    Log.i(TAG, "location poll hit age=${(System.currentTimeMillis() - fresh.time) / 1000}s")
                    finish(fresh)
                    return
                }
                if (polls < maxPolls) mainHandler.postDelayed(this, 2000)
            }
        }
        activePoll = pollRunnable
        mainHandler.postDelayed(pollRunnable, 2000)

        activeTimeout = Runnable { finish(lastLocation()) }
        mainHandler.postDelayed(activeTimeout!!, timeoutMs)
    }

    private fun cancelActiveLocationRequest() {
        activeListener?.let {
            try {
                locationManager.removeUpdates(it)
            } catch (_: Exception) {
            }
        }
        activeListener = null
        activeTimeout?.let { mainHandler.removeCallbacks(it) }
        activeTimeout = null
        activePoll?.let { mainHandler.removeCallbacks(it) }
        activePoll = null
    }

    fun buildCameraIntent(): Pair<Intent, File>? {
        return try {
            val photoFile = File(context.cacheDir, "oko_capture.jpg")
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", photoFile)
            val intent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
            intent to photoFile
        } catch (e: Exception) {
            Log.e(TAG, "camera intent failed", e)
            null
        }
    }

    fun encodePhotoFile(file: File): String? {
        if (!file.exists() || file.length() == 0L) return null
        val raw = BitmapFactory.decodeFile(file.absolutePath) ?: return null
        val scale = min(1f, PHOTO_MAX_PX.toFloat() / maxOf(raw.width, raw.height))
        val bmp = if (scale < 1f) {
            Bitmap.createScaledBitmap(
                raw,
                (raw.width * scale).toInt(),
                (raw.height * scale).toInt(),
                true,
            )
        } else {
            raw
        }
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, 65, out)
        if (bmp !== raw) bmp.recycle()
        raw.recycle()
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    fun toDeviceContextJson(snapshot: Snapshot, prefs: Prefs): String {
        val loc = snapshot.location
        val tars = prefs.skin == AgentSkin.TARS
        return Protocol.deviceContext(
            batteryPct = snapshot.batteryPct,
            network = snapshot.network,
            lat = loc?.latitude,
            lon = loc?.longitude,
            accuracyM = loc?.accuracy?.toDouble(),
            locationStatus = snapshot.locationStatus,
            photoBase64 = snapshot.photoBase64,
            tarsHonesty = if (tars) prefs.tarsHonesty else null,
            tarsHumor = if (tars) prefs.tarsHumor else null,
            tarsSarcasm = if (tars) prefs.tarsSarcasm else null,
        )
    }
}
