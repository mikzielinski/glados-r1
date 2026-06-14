package tech.glados.r1.ui

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.content.ContextCompat
import tech.glados.r1.LensShape
import tech.glados.r1.R
import kotlin.math.min

/** Agent lens — GLaDOS optic, HAL eye, or TARS monolith (oko-skin-kit.css). */
class LensView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

    enum class State { IDLE, LISTENING, THINKING, SPEAKING, ALERT, OFFLINE }

    var lensState: State = State.IDLE
        set(value) {
            if (field == value) return
            field = value
            applyStateAnimation()
            invalidate()
        }

    private val corePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { alpha = 90 }
    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f * resources.displayMetrics.density
    }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val segPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val tickPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }

    private var pulse = 1f
    private var spin = 0f
    private var segPhase = 0f
    private var animator: ValueAnimator? = null

    private var lensShape = LensShape.CIRCLE
    private var pulseDurationScale = 1f

    private var accentCore = ContextCompat.getColor(context, R.color.red_core)
    private var accentMid = ContextCompat.getColor(context, R.color.red_500)
    private var accentDark = ContextCompat.getColor(context, R.color.red_600)
    private var ringMuted = ContextCompat.getColor(context, R.color.clinical_500)
    private var accentSoft = 0x24E2122A
    private var accentLine = 0x73E2122A

    init {
        applyStateAnimation()
    }

    fun applySkin(
        shape: LensShape,
        core: Int,
        mid: Int,
        dark: Int,
        ring: Int,
        pulseScale: Float,
        soft: Int,
        line: Int,
    ) {
        lensShape = shape
        accentCore = core
        accentMid = mid
        accentDark = dark
        ringMuted = ring
        accentSoft = soft
        accentLine = line
        pulseDurationScale = pulseScale.coerceIn(0.7f, 2f)
        applyStateAnimation()
        invalidate()
    }

    override fun onDetachedFromWindow() {
        animator?.cancel()
        super.onDetachedFromWindow()
    }

    private fun applyStateAnimation() {
        animator?.cancel()
        val (duration, minScale, maxScale, spinSpeed) = when (lensState) {
            State.IDLE -> Quad(4200L, 0.93f, 1.0f, 0f)
            State.LISTENING -> Quad(900L, 0.95f, 1.08f, 0f)
            State.THINKING -> Quad(900L, 0.9f, 1.02f, 45f)
            State.SPEAKING -> Quad(340L, 0.85f, 1.14f, 0f)
            State.ALERT -> Quad(500L, 0.95f, 1.06f, 0f)
            State.OFFLINE -> Quad(0L, 1f, 1f, 0f)
        }
        pulse = maxScale
        spin = 0f
        segPhase = 0f
        if (duration <= 0L) {
            invalidate()
            return
        }
        animator = ValueAnimator.ofFloat(0f, 1f).apply {
            this.duration = (duration * pulseDurationScale).toLong().coerceAtLeast(200L)
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                val t = it.animatedValue as Float
                pulse = minScale + (maxScale - minScale) * (0.5f - 0.5f * kotlin.math.cos(t * 2 * Math.PI.toFloat()))
                spin = spinSpeed * t * 360f
                segPhase = t
                invalidate()
            }
            start()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        when (lensShape) {
            LensShape.HAL_EYE -> drawHalEye(canvas)
            LensShape.TARS_MONOLITH -> drawTarsBot(canvas)
            LensShape.CIRCLE -> drawGladosOptic(canvas)
        }
    }

    private fun accentTriple(): Triple<Int, Int, Int> = when (lensState) {
        State.OFFLINE -> Triple(ringMuted, ringMuted, 20)
        State.ALERT -> Triple(accentCore, accentCore, 140)
        else -> Triple(accentMid, accentDark, 110)
    }

    /** .glados-optic from oko-skin-kit.css */
    private fun drawGladosOptic(canvas: Canvas) {
        val cx = width / 2f
        val cy = height / 2f
        val size = min(width, height).toFloat()
        val (core, ring, glowAlpha) = accentTriple()

        // go-halo
        glowPaint.alpha = if (lensState == State.LISTENING || lensState == State.SPEAKING) 140 else 70
        glowPaint.shader = RadialGradient(
            cx, cy, size * 0.43f,
            intArrayOf(accentMid and 0x88FFFFFF.toInt(), accentSoft, 0x00000000),
            floatArrayOf(0f, 0.45f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, size * 0.43f, glowPaint)
        glowPaint.shader = null

        // go-iris
        ringPaint.color = accentLine
        ringPaint.strokeWidth = 2f * resources.displayMetrics.density
        canvas.drawCircle(cx, cy, size * 0.46f * pulse, ringPaint)

        // go-ticks (rotating when thinking)
        tickPaint.color = accentLine
        tickPaint.strokeWidth = 1.2f * resources.displayMetrics.density
        canvas.save()
        if (lensState == State.THINKING) canvas.rotate(spin, cx, cy)
        val tickR = size * 0.38f
        for (i in 0 until 40) {
            if (i % 5 != 0) continue
            val a = Math.toRadians(i * 9.0)
            canvas.drawLine(
                cx + tickR * kotlin.math.cos(a).toFloat(),
                cy + tickR * kotlin.math.sin(a).toFloat(),
                cx + (tickR + size * 0.04f) * kotlin.math.cos(a).toFloat(),
                cy + (tickR + size * 0.04f) * kotlin.math.sin(a).toFloat(),
                tickPaint,
            )
        }
        canvas.restore()

        // go-scanring
        if (lensState == State.THINKING) {
            ringPaint.color = accentMid
            ringPaint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(8f, 10f), spin * 2f)
            canvas.drawCircle(cx, cy, size * 0.36f, ringPaint)
            ringPaint.pathEffect = null
        }

        // go-core
        val coreR = size * 0.28f * pulse
        glowPaint.shader = RadialGradient(
            cx - coreR * 0.08f, cy - coreR * 0.1f, coreR,
            intArrayOf(0xFFFFFFFF.toInt(), 0xFFFFE9C4.toInt(), core, accentDark, 0xFF000000.toInt()),
            floatArrayOf(0f, 0.14f, 0.4f, 0.72f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, coreR, glowPaint)
        glowPaint.shader = null

        // catchlight
        corePaint.color = 0xE6FFFFFF.toInt()
        canvas.drawOval(
            cx - coreR * 0.28f,
            cy - coreR * 0.38f,
            cx - coreR * 0.02f,
            cy - coreR * 0.18f,
            corePaint,
        )

        // listening pulse ring
        if (lensState == State.LISTENING) {
            ringPaint.color = accentMid
            ringPaint.alpha = (120 + 80 * pulse).toInt().coerceIn(0, 255)
            canvas.drawCircle(cx, cy, size * 0.44f * pulse, ringPaint)
            ringPaint.alpha = 255
        }
    }

    /** .hal-eye from oko-skin-kit.css */
    private fun drawHalEye(canvas: Canvas) {
        val cx = width / 2f
        val cy = height / 2f
        val outer = min(width, height) * 0.48f
        val (core, _, glowAlpha) = accentTriple()

        fillPaint.shader = RadialGradient(
            cx, cy - outer * 0.04f, outer,
            intArrayOf(0xFF1C1C20.toInt(), 0xFF0C0C0E.toInt(), 0xFF000000.toInt()),
            floatArrayOf(0f, 0.6f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, outer, fillPaint)
        fillPaint.shader = null

        ringPaint.color = 0x59B4281E
        ringPaint.strokeWidth = 1.5f * resources.displayMetrics.density
        canvas.drawCircle(cx, cy, outer * 0.78f, ringPaint)

        val lensR = outer * 0.47f
        glowPaint.alpha = glowAlpha
        glowPaint.shader = RadialGradient(
            cx, cy, lensR * 1.4f,
            intArrayOf(core, accentDark, 0x00000000),
            floatArrayOf(0f, 0.45f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, lensR, glowPaint)
        glowPaint.shader = null

        corePaint.shader = RadialGradient(
            cx, cy - lensR * 0.04f, lensR * 0.92f,
            intArrayOf(0xFFC87848.toInt(), core, accentDark, 0xFF381810.toInt()),
            floatArrayOf(0f, 0.38f, 0.72f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, lensR * 0.88f, corePaint)
        corePaint.shader = null

        // he-fovea
        val foveaR = lensR * 0.28f
        corePaint.shader = RadialGradient(
            cx - foveaR * 0.1f, cy - foveaR * 0.08f, foveaR,
            intArrayOf(0xFFFFF6D8.toInt(), 0xFFFFD27A.toInt(), 0xFFD98A25.toInt()),
            floatArrayOf(0f, 0.4f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, foveaR, corePaint)
        corePaint.shader = null

        // he-spec
        corePaint.color = 0xBFFFFFFF.toInt()
        canvas.drawOval(cx - lensR * 0.12f, cy - lensR * 0.28f, cx + lensR * 0.04f, cy - lensR * 0.12f, corePaint)
    }

    /** .tars-bot from oko-skin-kit.css */
    private fun drawTarsBot(canvas: Canvas) {
        val gap = 3f * resources.displayMetrics.density
        val totalW = min(width * 0.76f, height * 0.72f)
        val segW = (totalW - gap * 3f) / 4f
        val segH = min(height * 0.78f, segW * 1.38f) * pulse
        val left = (width - totalW) / 2f
        val top = (height - segH) / 2f + height * 0.04f
        val radius = 4f * resources.displayMetrics.density

        for (i in 0 until 4) {
            val rect = RectF(
                left + i * (segW + gap),
                top,
                left + i * (segW + gap) + segW,
                top + segH,
            )
            segPaint.shader = LinearGradient(
                rect.left, rect.top, rect.right, rect.bottom,
                intArrayOf(0xFF353B42.toInt(), 0xFF262B31.toInt(), 0xFF111316.toInt()),
                floatArrayOf(0f, 0.52f, 1f),
                Shader.TileMode.CLAMP,
            )
            canvas.drawRoundRect(rect, radius, radius, segPaint)
            segPaint.shader = null
            fillPaint.color = 0x80000000.toInt()
            canvas.drawRect(rect.left, rect.bottom - segH * 0.14f, rect.right, rect.bottom - segH * 0.13f, fillPaint)
        }

        // tars-screen
        val screenW = totalW * 0.72f
        val screenH = segH * 0.19f
        val screenLeft = cx() - screenW / 2f
        val screenTop = top + segH * 0.15f
        fillPaint.color = 0xFF04060A.toInt()
        canvas.drawRoundRect(RectF(screenLeft, screenTop, screenLeft + screenW, screenTop + screenH), 3f, 3f, fillPaint)
        ringPaint.color = 0x14FFFFFF
        ringPaint.strokeWidth = 1f
        canvas.drawRoundRect(RectF(screenLeft, screenTop, screenLeft + screenW, screenTop + screenH), 3f, 3f, ringPaint)

        val dotCount = 5
        val dotGap = screenW * 0.08f
        val dotSize = screenH * 0.18f
        val dotsW = dotCount * dotSize + (dotCount - 1) * dotGap
        var dotX = screenLeft + (screenW - dotsW) / 2f
        val dotY = screenTop + screenH / 2f - dotSize / 2f
        for (i in 0 until dotCount) {
            val lit = when (lensState) {
                State.OFFLINE -> false
                State.IDLE -> i == 2
                else -> true
            }
            fillPaint.color = if (lit) accentMid else accentLine
            if (lit && lensState != State.OFFLINE) {
                val phase = ((segPhase + i * 0.15f) % 1f)
                fillPaint.alpha = (180 + 75 * (0.5f - 0.5f * kotlin.math.cos(phase * 2 * Math.PI.toFloat()))).toInt()
            } else {
                fillPaint.alpha = 255
            }
            canvas.drawRoundRect(dotX, dotY, dotX + dotSize, dotY + dotSize, 1f, 1f, fillPaint)
            fillPaint.alpha = 255
            dotX += dotSize + dotGap
        }
    }

    private fun cx() = width / 2f

    private data class Quad(val duration: Long, val min: Float, val max: Float, val spin: Float)
}
