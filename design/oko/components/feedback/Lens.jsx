import React from 'react';

/* OKO Lens — the single all-seeing eye. The one element in the system that emits light.
   It is never fully "off" while the agent is awake: at idle it breathes on a long, calm
   cycle. State drives glow, motion and the rotating "thinking" arc. */

const LENS_CSS = `
@keyframes oko-breath { 0%,100%{ transform:scale(0.975);} 50%{ transform:scale(1.025);} }
@keyframes oko-pulse  { 0%,100%{ opacity:0.55; transform:scale(1);} 50%{ opacity:1; transform:scale(1.08);} }
@keyframes oko-spin   { to { transform: rotate(360deg);} }
@keyframes oko-flicker{ 0%,100%{opacity:1;} 46%{opacity:.82;} 50%{opacity:.55;} 54%{opacity:.9;} }
@keyframes oko-alert  { 0%,100%{ filter:brightness(1);} 50%{ filter:brightness(1.5);} }
`;

function useLensCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-lens-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-lens-css';
    s.textContent = LENS_CSS;
    document.head.appendChild(s);
  }, []);
}

export function Lens({ state = 'idle', size = 160, amplitude = 0.5, label, style, ...rest }) {
  useLensCss();

  const dim = state === 'offline';
  const housing = Math.round(size);
  const disc = Math.round(size * 0.74);

  // breathing/pulse motion on the lens disc
  let discAnim = 'oko-breath var(--breath) var(--ease-hal) infinite';
  if (state === 'listening') discAnim = 'oko-breath var(--pulse) var(--ease-hal) infinite';
  if (state === 'thinking') discAnim = 'oko-flicker 2400ms steps(1,end) infinite, oko-breath var(--breath) var(--ease-hal) infinite';
  if (state === 'alert') discAnim = 'oko-alert 700ms var(--ease-hal) infinite';
  if (dim) discAnim = 'none';

  // glow intensity by state
  const glow = {
    idle:      'var(--glow-md)',
    listening: 'var(--glow-lg)',
    thinking:  'var(--glow-md)',
    speaking:  'var(--glow-lg)',
    alert:     '0 0 36px var(--red-glow), 0 0 120px rgba(226,18,42,0.45)',
    offline:   'none',
  }[state] || 'var(--glow-md)';

  // speaking scales the hot core by amplitude (0..1)
  const coreScale = state === 'speaking' ? 0.7 + Math.max(0, Math.min(1, amplitude)) * 0.6 : 1;

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', ...style }}
      {...rest}
    >
      <div style={{ position: 'relative', width: housing, height: housing }}>
        {/* machined housing */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 38%, #15171c, #08090b 70%, #040405)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(244,244,242,0.05)',
        }} />
        {/* rotating thinking arc */}
        {state === 'thinking' && (
          <div style={{
            position: 'absolute', inset: housing * 0.06, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 250deg, var(--red-500) 320deg, var(--red-core) 360deg)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
            animation: 'oko-spin 1600ms linear infinite',
            opacity: 0.9,
          }} />
        )}
        {/* listening pulse ring */}
        {state === 'listening' && (
          <div style={{
            position: 'absolute', inset: housing * 0.02, borderRadius: '50%',
            border: '1px solid var(--red-500)',
            animation: 'oko-pulse var(--pulse) var(--ease-hal) infinite',
          }} />
        )}
        {/* the lens disc */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: disc, height: disc,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: dim ? 'var(--lens-gradient-dim)' : 'var(--lens-gradient)',
          boxShadow: glow,
          animation: discAnim,
          transition: 'box-shadow var(--dur-slow) var(--ease-hal)',
        }}>
          {/* hot core / pupil */}
          <div style={{
            position: 'absolute', top: '42%', left: '50%', width: disc * 0.26, height: disc * 0.26,
            transform: `translate(-50%, -50%) scale(${coreScale})`,
            borderRadius: '50%',
            background: dim ? 'rgba(110,32,24,0.6)' : 'radial-gradient(circle at 50% 45%, #fff4ef 0%, #ff6a4d 45%, transparent 100%)',
            transition: 'transform var(--dur-fast) var(--ease-out-soft)',
          }} />
          {/* catchlight */}
          {!dim && (
            <div style={{
              position: 'absolute', top: '26%', left: '34%', width: disc * 0.08, height: disc * 0.08,
              borderRadius: '50%', background: 'rgba(255,255,255,0.6)', filter: 'blur(1px)',
            }} />
          )}
        </div>
      </div>
      {label && (
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: 'var(--fs-label)',
          letterSpacing: 'var(--track-label)', textTransform: 'uppercase',
          color: dim ? 'var(--text-muted)' : 'var(--text-secondary)',
        }}>{label}</span>
      )}
    </div>
  );
}
