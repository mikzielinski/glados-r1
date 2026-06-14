package tech.glados.r1.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import kotlin.math.min

/** oko-signal — three ascending bars in the HUD top-right. */
class SignalBarsView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var accent = 0xFFE2122A.toInt()

    fun setAccent(color: Int) {
        accent = color
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        paint.color = accent
        paint.alpha = 220
        val gap = width * 0.18f
        val barW = (width - gap * 2f) / 3f
        val heights = floatArrayOf(0.4f, 0.7f, 1f)
        for (i in 0 until 3) {
            val h = height * heights[i]
            val left = i * (barW + gap)
            canvas.drawRect(left, height - h, left + barW, height.toFloat(), paint)
        }
    }
}

/** oko-wave — VU meter bars while listening or speaking. */
class WaveformView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var accent = 0xFFE2122A.toInt()
    private var accentLine = 0x73E2122A.toInt()
    private var active = false
    private var phase = 0f
    private val barCount = 18

    private val anim = object : Runnable {
        override fun run() {
            if (!active) return
            phase += 0.08f
            if (phase > 1f) phase -= 1f
            invalidate()
            postOnAnimationDelayed(this, 48)
        }
    }

    fun setAccent(color: Int, lineColor: Int) {
        accent = color
        accentLine = lineColor
        invalidate()
    }

    fun setActive(value: Boolean) {
        if (active == value) return
        active = value
        removeCallbacks(anim)
        if (active) postOnAnimation(anim) else invalidate()
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(anim)
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val gap = 3f * resources.displayMetrics.density
        val barW = 3f * resources.displayMetrics.density
        val total = barCount * barW + (barCount - 1) * gap
        var x = (width - total) / 2f
        val mid = (barCount - 1) / 2f
        for (i in 0 until barCount) {
            val fall = 1f - kotlin.math.abs(i - mid) / (mid + 1f)
            val base = 0.18f + fall * 0.72f
            val wave = if (active) {
                0.5f - 0.5f * kotlin.math.cos((phase + i * 0.11f) * 2 * Math.PI.toFloat())
            } else 0f
            val scale = (base * (if (active) 0.35f + wave * 0.65f else 0.22f)).coerceIn(0.08f, 1f)
            paint.color = if (active) accent else accentLine
            val h = height * scale
            val radius = barW / 2f
            canvas.drawRoundRect(x, height - h, x + barW, height.toFloat(), radius, radius, paint)
            x += barW + gap
        }
    }
}

/** Screen overlays from oko-skin-kit: grid, scanlines, vignette. */
class OkoOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    private val gridPaint = Paint()
    private val scanPaint = Paint()
    private val vignettePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var accentSoft = 0x24E2122A

    fun setAccentSoft(color: Int) {
        accentSoft = color
        gridPaint.color = color
        invalidate()
    }

    init {
        gridPaint.color = accentSoft
        gridPaint.strokeWidth = 1f
        scanPaint.color = 0x38000000
        vignettePaint.color = 0x66000000
        vignettePaint.style = Paint.Style.STROKE
        vignettePaint.strokeWidth = 60f * resources.displayMetrics.density
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val step = 22f * resources.displayMetrics.density
        var y = 0f
        while (y < height) {
            canvas.drawLine(0f, y, width.toFloat(), y, gridPaint)
            y += step
        }
        var x = 0f
        while (x < width) {
            canvas.drawLine(x, 0f, x, height.toFloat(), gridPaint)
            x += step
        }

        val scanH = 4f * resources.displayMetrics.density
        var sy = 0f
        while (sy < height) {
            canvas.drawRect(0f, sy + scanH * 0.5f, width.toFloat(), sy + scanH, scanPaint)
            sy += scanH * 2f
        }

        canvas.drawRect(
            vignettePaint.strokeWidth / 2f,
            vignettePaint.strokeWidth / 2f,
            width - vignettePaint.strokeWidth / 2f,
            height - vignettePaint.strokeWidth / 2f,
            vignettePaint,
        )
    }
}
