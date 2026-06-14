/* R1 device shell — stylized Rabbit R1: bright orange body, square-ish screen well,
   knurled scroll wheel on the right, push-to-talk via the wheel. Children render
   inside the screen. Cosmetic only; the screen content is the real subject. */

function DeviceFrame({ children, onPTT, listening = false }) {
  return (
    <div style={{
      position: 'relative', width: 372, padding: 18,
      borderRadius: 30,
      background: 'linear-gradient(150deg, #ff6a2b 0%, #f1531a 46%, #d63f10 100%)',
      boxShadow: '0 40px 90px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.35), inset 0 -3px 8px rgba(0,0,0,0.35)',
    }}>
      {/* brand notch */}
      <div style={{
        position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.32em',
        color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase',
      }}>r-one</div>

      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        {/* screen well */}
        <div style={{
          position: 'relative', width: 300, height: 392, flex: '0 0 auto',
          borderRadius: 14, overflow: 'hidden',
          background: 'var(--void-900)',
          boxShadow: 'var(--inset-screen), inset 0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3px rgba(0,0,0,0.4)',
        }}>
          {children}
          {/* scanline overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'var(--scanlines)', opacity: 0.5, mixBlendMode: 'overlay',
          }} />
          {/* glass glare */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), transparent 38%)',
          }} />
        </div>

        {/* right rail: scroll wheel = push-to-talk */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, width: 30 }}>
          <button
            onClick={onPTT}
            title="Push-to-talk"
            style={{
              width: 30, height: 92, borderRadius: 16, cursor: 'pointer',
              border: 'none', padding: 0,
              background: listening
                ? 'repeating-linear-gradient(0deg,#3a0810,#3a0810 3px,#5a0d18 3px,#5a0d18 6px)'
                : 'repeating-linear-gradient(0deg,#1a1206,#1a1206 3px,#2a1d0c 3px,#2a1d0c 6px)',
              boxShadow: listening
                ? 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 16px var(--red-glow)'
                : 'inset 0 0 0 1px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.5)',
              transition: 'box-shadow var(--dur-base) var(--ease-hal), background var(--dur-base)',
            }}
          />
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, #444, #111)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
          }} />
        </div>
      </div>

      {/* speaker grille */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 12, marginBottom: 2 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.4)' }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DeviceFrame });
