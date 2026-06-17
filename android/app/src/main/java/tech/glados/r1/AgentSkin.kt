package tech.glados.r1

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.view.View
import androidx.core.content.ContextCompat
import androidx.core.graphics.ColorUtils
import tech.glados.r1.databinding.ActivityMainBinding
import tech.glados.r1.ui.LensView

/** Agent skin — persona (backend) + on-device lens shape / accent. */
enum class AgentSkin(val id: String) {
    HAL9000("hal9000"),
    GLADOS("glados"),
    TARS("tars"),
    ONEE("onee"),
    TSUN("tsun"),
    KOHAI("kohai"),
    KOMANDOR("komandor"),
    EGZ("egz"),
    WIESIEK("wiesiek");

    companion object {
        fun fromId(id: String?): AgentSkin =
            entries.find { it.id == id } ?: when (id) {
                "oko" -> GLADOS
                else -> HAL9000
            }
    }
}

enum class LensShape {
    CIRCLE,
    HAL_EYE,
    TARS_MONOLITH,
    ONEE,
    TSUN,
    KOHAI,
    KOMANDOR,
    EGZ,
    WIESIEK,
}

data class SkinTokens(
    val brandName: String,
    val logLabel: String,
    val settingsLabel: String,
    val lensShape: LensShape,
    val lensCore: Int,
    val lensMid: Int,
    val lensDark: Int,
    val ringColor: Int,
    val pulseDurationScale: Float,
    val accent: Int,
    val accentSoft: Int,
    val accentLine: Int,
    /** Tsundere warm «dere» tone; defaults to accent when null. */
    val accentWarm: Int = accent,
)

object SkinCatalog {
    fun tokens(skin: AgentSkin, ctx: Context): SkinTokens = when (skin) {
        AgentSkin.HAL9000 -> SkinTokens(
            brandName = "HAL-9000",
            logLabel = "HAL",
            settingsLabel = ctx.getString(R.string.skin_hal9000),
            lensShape = LensShape.HAL_EYE,
            lensCore = 0xFFE85A45.toInt(),
            lensMid = 0xFFCC2E1F.toInt(),
            lensDark = 0xFF8B1510.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_700),
            pulseDurationScale = 1.55f,
            accent = 0xFFCC2E1F.toInt(),
            accentSoft = 0x24CC2E1F,
            accentLine = 0x73CC2E1F,
        )
        AgentSkin.GLADOS -> SkinTokens(
            brandName = "GLaDOS",
            logLabel = "GLaDOS",
            settingsLabel = ctx.getString(R.string.skin_glados),
            lensShape = LensShape.CIRCLE,
            lensCore = 0xFFE8A33D.toInt(),
            lensMid = 0xFFD4881A.toInt(),
            lensDark = 0xFF8A5A10.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_300),
            pulseDurationScale = 0.95f,
            accent = 0xFFD4881A.toInt(),
            accentSoft = 0x24D4881A,
            accentLine = 0x73D4881A,
        )
        AgentSkin.TARS -> SkinTokens(
            brandName = "TARS",
            logLabel = "TARS",
            settingsLabel = ctx.getString(R.string.skin_tars),
            lensShape = LensShape.TARS_MONOLITH,
            lensCore = 0xFF7EB8D4.toInt(),
            lensMid = 0xFF5A9BB8.toInt(),
            lensDark = 0xFF2E4555.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.panel_700),
            pulseDurationScale = 1.15f,
            accent = 0xFF5A9BB8.toInt(),
            accentSoft = 0x245A9BB8,
            accentLine = 0x735A9BB8,
        )
        AgentSkin.ONEE -> SkinTokens(
            brandName = "On-Ē",
            logLabel = "On-Ē",
            settingsLabel = ctx.getString(R.string.skin_onee),
            lensShape = LensShape.ONEE,
            lensCore = 0xFFF0A8B8.toInt(),
            lensMid = 0xFFE87890.toInt(),
            lensDark = 0xFF9A4058.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_300),
            pulseDurationScale = 1.35f,
            accent = 0xFFE87890.toInt(),
            accentSoft = 0x24E87890,
            accentLine = 0x73E87890,
        )
        AgentSkin.TSUN -> SkinTokens(
            brandName = "Tsundere",
            logLabel = "Tsundere",
            settingsLabel = ctx.getString(R.string.skin_tsun),
            lensShape = LensShape.TSUN,
            lensCore = 0xFF9EC8F0.toInt(),
            lensMid = 0xFF6BA0D8.toInt(),
            lensDark = 0xFF3A5880.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_500),
            pulseDurationScale = 1.05f,
            accent = 0xFF6BA0D8.toInt(),
            accentSoft = 0x246BA0D8,
            accentLine = 0x736BA0D8,
            accentWarm = 0xFFE87890.toInt(),
        )
        AgentSkin.KOHAI -> SkinTokens(
            brandName = "Kōhai",
            logLabel = "Kōhai",
            settingsLabel = ctx.getString(R.string.skin_kohai),
            lensShape = LensShape.KOHAI,
            lensCore = 0xFFFFC878.toInt(),
            lensMid = 0xFFE8A048.toInt(),
            lensDark = 0xFF986028.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_300),
            pulseDurationScale = 0.82f,
            accent = 0xFFE8A048.toInt(),
            accentSoft = 0x24E8A048,
            accentLine = 0x73E8A048,
        )
        AgentSkin.KOMANDOR -> SkinTokens(
            brandName = "Kapitan",
            logLabel = "Kapitan",
            settingsLabel = ctx.getString(R.string.skin_komandor),
            lensShape = LensShape.KOMANDOR,
            lensCore = 0xFFFF8858.toInt(),
            lensMid = 0xFFE85828.toInt(),
            lensDark = 0xFF983818.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_700),
            pulseDurationScale = 0.78f,
            accent = 0xFFE85828.toInt(),
            accentSoft = 0x24E85828,
            accentLine = 0x73E85828,
        )
        AgentSkin.EGZ -> SkinTokens(
            brandName = "Egzorcysta",
            logLabel = "Egzorcysta",
            settingsLabel = ctx.getString(R.string.skin_egz),
            lensShape = LensShape.EGZ,
            lensCore = 0xFF88D8A8.toInt(),
            lensMid = 0xFF58B878.toInt(),
            lensDark = 0xFF286840.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.panel_700),
            pulseDurationScale = 1.25f,
            accent = 0xFF58B878.toInt(),
            accentSoft = 0x2458B878,
            accentLine = 0x7358B878,
        )
        AgentSkin.WIESIEK -> SkinTokens(
            brandName = "Pan Wiesio",
            logLabel = "Wiesio",
            settingsLabel = ctx.getString(R.string.skin_wiesiek),
            lensShape = LensShape.WIESIEK,
            lensCore = 0xFFFFE858.toInt(),
            lensMid = 0xFFE8C830.toInt(),
            lensDark = 0xFF988818.toInt(),
            ringColor = ContextCompat.getColor(ctx, R.color.clinical_500),
            pulseDurationScale = 1.18f,
            accent = 0xFFE8C830.toInt(),
            accentSoft = 0x24E8C830,
            accentLine = 0x73E8C830,
        )
    }

    fun apply(binding: ActivityMainBinding, tokens: SkinTokens) {
        binding.lens.applySkin(
            tokens.lensShape,
            tokens.lensCore,
            tokens.lensMid,
            tokens.lensDark,
            tokens.ringColor,
            tokens.pulseDurationScale,
            tokens.accentSoft,
            tokens.accentLine,
            tokens.accentWarm,
        )
        binding.brandLabel.setTextColor(tokens.accent)
        binding.sysbarState.setTextColor(ColorUtils.setAlphaComponent(tokens.accent, 180))
        binding.status.setTextColor(tokens.accent)
        binding.hint.setTextColor(ColorUtils.setAlphaComponent(tokens.accent, 140))
        binding.waveform.setAccent(tokens.accent, tokens.accentLine)
        binding.screenOverlay.setAccentSoft(tokens.accentSoft)

        val square = binding.statusSquare.background as? GradientDrawable
            ?: GradientDrawable().also { binding.statusSquare.background = it }
        square.setColor(tokens.accent)

        val transcriptBg = binding.transcriptFrame.background as? GradientDrawable
            ?: GradientDrawable().also { binding.transcriptFrame.background = it }
        transcriptBg.cornerRadius = 6f * binding.root.resources.displayMetrics.density
        transcriptBg.setColor(tokens.accentSoft)
        transcriptBg.setStroke(
            (1f * binding.root.resources.displayMetrics.density).toInt(),
            tokens.accentLine,
        )

        val led = binding.sysbarDot.background as? GradientDrawable
            ?: GradientDrawable().also {
                it.shape = GradientDrawable.OVAL
                binding.sysbarDot.background = it
            }
        led.setColor(tokens.accent)

        tintBracket(binding.transcriptFrame, tokens.accentLine)
    }

    private fun tintBracket(root: View, color: Int) {
        if (root !is android.view.ViewGroup) return
        for (i in 0 until root.childCount) {
            val child = root.getChildAt(i)
            if (child.id == R.id.transcriptScroll || child.id == R.id.log) continue
            child.background?.setTint(color)
        }
    }
}
