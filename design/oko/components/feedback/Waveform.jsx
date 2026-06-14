import React from 'react';

/* OKO Waveform — voice activity bars. Used beneath the lens while listening or speaking.
   Animated, symmetrical, monochrome-red. Bars idle low and "breathe" when listening,
   or render a static pattern from `levels` if you want to drive it yourself. */

const WAVE_CSS = `
@keyframes oko-wave { 0%,100%{ transform:scaleY(0.28);} 50%{ transform:scaleY(1);} }
`;

function useWaveCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-wave-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-wave-css';
    s.textContent = WAVE_CSS;
    document.head.appendChild(s);
  }, []);
}

export function Waveform({
  bars = 24, height = 40, active = true, color = 'var(--red-500)', levels, style, ...rest
}) {
  useWaveCss();
  const n = levels ? levels.length : bars;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 3, height, ...style,
      }}
      {...rest}
    >
      {Array.from({ length: n }).map((_, i) => {
        // bell-shaped baseline so the center is tallest
        const mid = (n - 1) / 2;
        const fall = 1 - Math.abs(i - mid) / (mid + 1);
        const base = 0.25 + fall * 0.7;
        const lvl = levels ? Math.max(0.08, levels[i]) : base;
        const delay = (Math.abs(i - mid) * 70 + (i % 3) * 40);
        return (
          <span
            key={i}
            style={{
              width: 3, borderRadius: 'var(--radius-pill)',
              height: '100%',
              background: color,
              transformOrigin: 'center',
              transform: `scaleY(${lvl})`,
              boxShadow: '0 0 6px var(--red-glow)',
              animation: (active && !levels) ? `oko-wave ${680 + (i % 5) * 90}ms var(--ease-hal) ${delay}ms infinite` : 'none',
              opacity: active ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
