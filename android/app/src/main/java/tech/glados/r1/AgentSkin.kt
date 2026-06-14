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
    TARS("tars");

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
