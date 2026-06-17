package tech.glados.r1.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.Shader
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * OKO Pakiet Person vol.2 lens forms — ported from design/oko/skins/personas-vol2.html
 * (.f-onee, .f-tsun, .f-kohai, .f-komandor, .f-egz, .f-wiesiek)
 */
internal object LensVol2 {

    data class Palette(
        val core: Int,
        val mid: Int,
        val dark: Int,
        val secondary: Int = mid,
    )

    fun drawOnee(
        canvas: Canvas,
        w: Int,
        h: Int,
        state: LensView.State,
        palette: Palette,
        pulse: Float,
        segPhase: Float,
    ) {
        val cx = w / 2f
        val cy = h / 2f
        val scale = min(w, h) / 128f
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        val orbR = 39f * scale * pulse

        // lashes
        p.style = Paint.Style.STROKE
        p.strokeWidth = 2f * scale
        p.color = withAlpha(palette.mid, 140)
        drawArcTop(canvas, cx, cy - 18f * scale, 59f * scale, 27f * scale, p)
        p.color = withAlpha(palette.mid, 76)
        drawArcTop(canvas, cx, cy - 14f * scale, 48f * scale, 22f * scale, p)

        // orb
        p.style = Paint.Style.FILL
        p.shader = RadialGradient(
            cx - orbR * 0.08f, cy - orbR * 0.1f, orbR,
            intArrayOf(0xFFFFFFFF.toInt(), 0xFFFFE3EE.toInt(), palette.mid, palette.dark, 0xFF000000.toInt()),
            floatArrayOf(0f, 0.16f, 0.46f, 0.8f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, orbR, p)
        p.shader = null

        // glint +
        p.color = 0xD9FFFFFF.toInt()
        p.textSize = 15f * scale
        p.textAlign = Paint.Align.CENTER
        canvas.drawText("+", cx + orbR * 0.35f, cy - orbR * 0.05f, p)

        // fan (simplified wedge)
        canvas.save()
        canvas.translate(cx + 18f * scale, cy + 22f * scale)
        canvas.rotate(15f)
        p.color = palette.mid
        val fan = Path().apply {
            moveTo(0f, 0f)
            lineTo(-22f * scale, -20f * scale)
            lineTo(0f, -38f * scale)
            lineTo(22f * scale, -20f * scale)
            close()
        }
        canvas.drawPath(fan, p)
        canvas.restore()

        // sakura petals when speaking/listening
        if (state == LensView.State.SPEAKING || state == LensView.State.LISTENING) {
            for (i in 0 until 3) {
                val phase = (segPhase + i * 0.33f) % 1f
                val px = cx + (i - 1) * 14f * scale + phase * 16f * scale
                val py = cy - 30f * scale + phase * h * 0.55f
                p.color = withAlpha(palette.core, ((1f - phase) * 200).toInt())
                canvas.drawOval(px - 5f * scale, py - 6f * scale, px + 5f * scale, py + 6f * scale, p)
            }
        }
    }

    fun drawTsun(
        canvas: Canvas,
        w: Int,
        h: Int,
        state: LensView.State,
        palette: Palette,
        pulse: Float,
        spin: Float,
    ) {
        val cx = w / 2f
        val cy = h / 2f
        val scale = min(w, h) / 128f
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        val speaking = state == LensView.State.SPEAKING
        val cold = if (speaking) palette.secondary else palette.mid
        val irisR = 38f * scale * pulse

        // twin tails
        p.style = Paint.Style.FILL
        p.color = cold
        drawTail(canvas, cx - irisR * 0.85f, cy, 12f * scale, 31f * scale, 15f, p)
        drawTail(canvas, cx + irisR * 0.85f, cy, 12f * scale, 31f * scale, -15f, p)

        // hex iris
        val hex = hexPath(cx, cy, irisR)
        p.shader = RadialGradient(
            cx - irisR * 0.08f, cy - irisR * 0.08f, irisR,
            intArrayOf(0xFFEAF3FF.toInt(), cold, palette.dark),
            floatArrayOf(0f, 0.48f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawPath(hex, p)
        p.shader = null

        if (state == LensView.State.THINKING) {
            p.color = cold
            p.strokeWidth = 3f * scale
            p.style = Paint.Style.STROKE
            canvas.drawLine(cx - irisR * 0.55f, cy - irisR * 0.55f, cx - irisR * 0.15f, cy - irisR * 0.15f, p)
            canvas.drawLine(cx - irisR * 0.55f, cy - irisR * 0.15f, cx - irisR * 0.15f, cy - irisR * 0.55f, p)
            p.style = Paint.Style.FILL
        }

        if (speaking) {
            val heartR = 11f * scale * pulse
            p.color = palette.secondary
            canvas.drawPath(heartPath(cx, cy + irisR * 0.15f, heartR), p)
        }
    }

    fun drawKohai(
        canvas: Canvas,
        w: Int,
        h: Int,
        state: LensView.State,
        palette: Palette,
        pulse: Float,
        spin: Float,
        segPhase: Float,
    ) {
        val cx = w / 2f
        val cy = h / 2f + when (state) {
            LensView.State.LISTENING, LensView.State.SPEAKING -> -4f * pulse
            else -> 0f
        }
        val scale = min(w, h) / 128f
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        val starR = 35f * scale * pulse

        canvas.save()
        if (state == LensView.State.THINKING) canvas.rotate(spin, cx, cy)

        p.color = palette.mid
        canvas.drawPath(starPath(cx, cy, starR), p)

        p.color = 0xEBFFFFFF.toInt()
        canvas.drawCircle(cx, cy, 9f * scale, p)

        // ribbon knot
        p.color = blend(palette.mid, 0xFFFFFFFF.toInt(), 0.35f)
        canvas.drawRoundRect(
            cx - 5f * scale, cy + starR * 0.55f,
            cx + 5f * scale, cy + starR * 0.55f + 8f * scale,
            3f * scale, 3f * scale, p,
        )
        canvas.restore()

        if (state == LensView.State.LISTENING || state == LensView.State.SPEAKING) {
            p.color = palette.mid
            p.textSize = 22f * scale
            p.textAlign = Paint.Align.CENTER
            canvas.drawText("!", cx + starR * 0.55f, cy - starR * 0.35f, p)
            canvas.drawText("!", cx - starR * 0.55f, cy - starR * 0.15f, p)
            // up arrow
            val up = Path().apply {
                moveTo(cx, cy - starR * 0.95f)
                lineTo(cx - 7f * scale, cy - starR * 0.75f)
                lineTo(cx + 7f * scale, cy - starR * 0.75f)
                close()
            }
            canvas.drawPath(up, p)
        }
    }

    fun drawKomandor(
        canvas: Canvas,
        w: Int,
        h: Int,
        state: LensView.State,
        palette: Palette,
        pulse: Float,
        spin: Float,
        segPhase: Float,
    ) {
        val cx = w / 2f
        val cy = h / 2f
        val scale = min(w, h) / 128f
        val p = Paint(Paint.ANTI_ALIAS_FLAG)

        if (state == LensView.State.SPEAKING) {
            val boomR = 61f * scale * (0.5f + segPhase * 1f)
            p.color = withAlpha(palette.mid, ((1f - segPhase) * 180).toInt())
            canvas.drawPath(starBurstPath(cx, cy, boomR), p)
        }

        // hazard ring
        canvas.save()
        canvas.rotate(if (state == LensView.State.IDLE) spin * 0.25f else spin, cx, cy)
        p.style = Paint.Style.STROKE
        p.strokeWidth = 8f * scale
        for (i in 0 until 12) {
            p.color = if (i % 2 == 0) palette.mid else 0xFF161310.toInt()
            val a0 = Math.toRadians(i * 30.0)
            val a1 = Math.toRadians((i + 1) * 30.0)
            val r0 = 50f * scale
            val r1 = 58f * scale
            canvas.drawArc(
                cx - r1, cy - r1, cx + r1, cy + r1,
                Math.toDegrees(a0).toFloat(),
                30f, false, p,
            )
        }
        canvas.restore()

        // bomb body
        val bombR = 30f * scale * pulse
        p.style = Paint.Style.FILL
        p.shader = RadialGradient(
            cx - bombR * 0.2f, cy - bombR * 0.2f, bombR,
            intArrayOf(0xFF595D63.toInt(), 0xFF1B1D20.toInt(), 0xFF050506.toInt()),
            floatArrayOf(0f, 0.46f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, bombR, p)
        p.shader = null

        // fuse + spark
        p.color = 0xFF7A5836.toInt()
        p.strokeWidth = 2.5f * scale
        p.style = Paint.Style.STROKE
        canvas.drawArc(cx - 4f * scale, cy - bombR - 8f * scale, cx + 14f * scale, cy - bombR + 6f * scale, 200f, 80f, false, p)
        p.style = Paint.Style.FILL
        p.shader = RadialGradient(
            cx + 8f * scale, cy - bombR - 10f * scale, 8f * scale,
            intArrayOf(0xFFFFFFFF.toInt(), palette.mid, 0xFF5A1C08.toInt()),
            floatArrayOf(0f, 0.55f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx + 8f * scale, cy - bombR - 10f * scale, 5f * scale * pulse, p)
        p.shader = null
    }

    fun drawEgz(
        canvas: Canvas,
        w: Int,
        h: Int,
        state: LensView.State,
        palette: Palette,
        pulse: Float,
        segPhase: Float,
    ) {
        val cx = w / 2f
        val cy = h / 2f
        val scale = min(w, h) / 128f
        val p = Paint(Paint.ANTI_ALIAS_FLAG)

        // halo
        p.style = Paint.Style.STROKE
        p.strokeWidth = 1f * scale
        p.color = withAlpha(palette.mid, 100)
        canvas.drawCircle(cx, cy, 48f * scale, p)

        // cross
        p.style = Paint.Style.FILL
        p.color = blend(palette.mid, 0xFF1A1D18.toInt(), 0.45f)
        canvas.drawRoundRect(cx + 8f * scale, cy - 50f * scale, cx + 18f * scale, cy + 50f * scale, 2f * scale, 2f * scale, p)
        canvas.drawRoundRect(cx - 20f * scale, cy - 32f * scale, cx + 36f * scale, cy - 22f * scale, 2f * scale, 2f * scale, p)

        // candle flame
        val flameH = 19f * scale * pulse
        val flicker = if (state == LensView.State.SPEAKING) 1.16f else 1f
        p.shader = RadialGradient(
            cx, cy + 20f * scale, flameH,
            intArrayOf(0xFFFFFFFF.toInt(), blend(palette.mid, 0xFFFFFFFF.toInt(), 0.3f), palette.mid, palette.dark),
            floatArrayOf(0f, 0.24f, 0.55f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawOval(cx - 12f * scale, cy + 8f * scale, cx + 12f * scale, cy + 8f * scale + flameH * flicker, p)
        p.shader = null

        // imp
        val impX = cx + 28f * scale
        val impY = cy + 24f * scale
        p.color = 0xFF141008.toInt()
        canvas.drawOval(impX - 11f * scale, impY - 9f * scale, impX + 11f * scale, impY + 9f * scale, p)
        if (state == LensView.State.SPEAKING) {
            p.color = withAlpha(palette.mid, 80)
        }
        // horns
        drawHorns(canvas, impX, impY - 8f * scale, 4f * scale, p)

        // smoke
        if (state != LensView.State.OFFLINE) {
            val smokeA = (segPhase * 255).toInt().coerceIn(0, 120)
            p.color = withAlpha(0xFF888888.toInt(), smokeA)
            canvas.drawCircle(cx, cy - 10f * scale - segPhase * 26f * scale, 3f * scale, p)
        }
    }

    fun drawWiesiek(
        canvas: Canvas,
        w: Int,
        h: Int,
        state: LensView.State,
        palette: Palette,
        pulse: Float,
        segPhase: Float,
    ) {
        val cx = w / 2f
        val cy = h / 2f + 6f * min(w, h) / 128f
        val scale = min(w, h) / 128f
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        val eyeR = 36f * scale * pulse

        // hard hat brim
        p.color = blend(palette.mid, 0xFF000000.toInt(), 0.22f)
        canvas.drawOval(cx - 54f * scale, cy - eyeR - 18f * scale, cx + 54f * scale, cy - eyeR - 6f * scale, p)

        // hat dome
        p.shader = LinearGradientCompat(
            cx, cy - eyeR - 40f * scale, cx, cy - eyeR,
            palette.mid, blend(palette.mid, 0xFF000000.toInt(), 0.45f),
        )
        canvas.drawArc(cx - 43f * scale, cy - eyeR - 44f * scale, cx + 43f * scale, cy - eyeR + 4f * scale, 180f, 180f, true, p)
        p.shader = null

        // eye
        p.shader = RadialGradient(
            cx - eyeR * 0.08f, cy - eyeR * 0.08f, eyeR,
            intArrayOf(0xFFFFFFFF.toInt(), 0xFFFFF6D8.toInt(), palette.mid, palette.dark, 0xFF000000.toInt()),
            floatArrayOf(0f, 0.14f, 0.44f, 0.78f, 1f),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, eyeR, p)
        p.shader = null

        // beer can
        p.color = 0xFF6DB04A.toInt()
        canvas.drawRoundRect(
            cx - eyeR - 8f * scale, cy + 8f * scale,
            cx - eyeR + 5f * scale, cy + 30f * scale,
            2f * scale, 2f * scale, p,
        )

        // trowel
        val swipe = if (state == LensView.State.SPEAKING) -46f * scale * sin(segPhase * Math.PI.toFloat()) else 0f
        canvas.save()
        canvas.translate(cx + eyeR * 0.55f + swipe, cy + eyeR * 0.35f)
        canvas.rotate(if (state == LensView.State.SPEAKING) -6f * sin(segPhase * Math.PI.toFloat()) else 0f)
        p.color = 0xFF888D94.toInt()
        val trowel = Path().apply {
            moveTo(0f, 0f)
            lineTo(22f * scale, -7f * scale)
            lineTo(30f * scale, 0f)
            lineTo(22f * scale, 7f * scale)
            close()
        }
        canvas.drawPath(trowel, p)
        p.color = 0xFF5A3C1E.toInt()
        canvas.drawRoundRect(-9f * scale, -2.5f * scale, 0f, 2.5f * scale, 2f * scale, 2f * scale, p)
        canvas.restore()
    }

    // --- helpers ---

    private fun hexPath(cx: Float, cy: Float, r: Float): Path = Path().apply {
        for (i in 0 until 6) {
            val a = Math.toRadians(60.0 * i - 90.0)
            val x = cx + r * cos(a).toFloat()
            val y = cy + r * sin(a).toFloat()
            if (i == 0) moveTo(x, y) else lineTo(x, y)
        }
        close()
    }

    private fun starPath(cx: Float, cy: Float, r: Float): Path = Path().apply {
        val pts = floatArrayOf(
            50f, 0f, 61f, 35f, 98f, 35f, 68f, 57f, 79f, 91f,
            50f, 70f, 21f, 91f, 32f, 57f, 2f, 35f, 39f, 35f,
        )
        for (i in pts.indices step 2) {
            val x = cx + (pts[i] - 50f) / 50f * r
            val y = cy + (pts[i + 1] - 50f) / 50f * r
            if (i == 0) moveTo(x, y) else lineTo(x, y)
        }
        close()
    }

    private fun starBurstPath(cx: Float, cy: Float, r: Float): Path = Path().apply {
        val pts = floatArrayOf(
            50f, 0f, 59f, 26f, 79f, 12f, 71f, 36f, 98f, 33f, 76f, 52f, 93f, 80f,
            63f, 67f, 50f, 100f, 37f, 67f, 7f, 80f, 24f, 52f, 2f, 33f, 29f, 36f, 21f, 12f, 41f, 26f,
        )
        for (i in pts.indices step 2) {
            val x = cx + (pts[i] - 50f) / 50f * r
            val y = cy + (pts[i + 1] - 50f) / 50f * r
            if (i == 0) moveTo(x, y) else lineTo(x, y)
        }
        close()
    }

    private fun heartPath(cx: Float, cy: Float, r: Float): Path = Path().apply {
        moveTo(cx, cy + r)
        cubicTo(cx - r * 1.8f, cy - r * 0.2f, cx - r * 0.9f, cy - r * 1.4f, cx, cy - r * 0.55f)
        cubicTo(cx + r * 0.9f, cy - r * 1.4f, cx + r * 1.8f, cy - r * 0.2f, cx, cy + r)
        close()
    }

    private fun drawTail(canvas: Canvas, x: Float, y: Float, w: Float, h: Float, rot: Float, p: Paint) {
        canvas.save()
        canvas.translate(x, y)
        canvas.rotate(rot)
        canvas.drawRoundRect(-w / 2f, -h * 0.55f, w / 2f, h * 0.45f, w * 0.4f, h * 0.35f, p)
        canvas.restore()
    }

    private fun drawArcTop(canvas: Canvas, cx: Float, cy: Float, rx: Float, ry: Float, p: Paint) {
        canvas.drawArc(cx - rx, cy - ry, cx + rx, cy + ry, 200f, 140f, false, p)
    }

    private fun drawHorns(canvas: Canvas, cx: Float, cy: Float, s: Float, p: Paint) {
        val left = Path().apply {
            moveTo(cx - 6f * s, cy)
            lineTo(cx - 4f * s, cy - 7f * s)
            lineTo(cx - 2f * s, cy)
            close()
        }
        val right = Path().apply {
            moveTo(cx + 6f * s, cy)
            lineTo(cx + 4f * s, cy - 7f * s)
            lineTo(cx + 2f * s, cy)
            close()
        }
        canvas.drawPath(left, p)
        canvas.drawPath(right, p)
    }

    private fun withAlpha(color: Int, alpha: Int): Int =
        Color.argb(alpha.coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))

    private fun blend(a: Int, b: Int, t: Float): Int {
        val u = t.coerceIn(0f, 1f)
        return Color.rgb(
            (Color.red(a) * (1 - u) + Color.red(b) * u).toInt(),
            (Color.green(a) * (1 - u) + Color.green(b) * u).toInt(),
            (Color.blue(a) * (1 - u) + Color.blue(b) * u).toInt(),
        )
    }

    private fun LinearGradientCompat(x0: Float, y0: Float, x1: Float, y1: Float, c0: Int, c1: Int): Shader =
        android.graphics.LinearGradient(x0, y0, x1, y1, c0, c1, Shader.TileMode.CLAMP)
}
