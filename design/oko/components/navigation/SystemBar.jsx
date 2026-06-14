import React from 'react';

/* OKO SystemBar — the thin status strip across the top of the R1 screen. Left: the agent
   state (a pulsing status dot + mono label). Right: clinical telemetry (time, signal,
   battery) in mono. Everything monospace — this is the machine reporting on itself. */

const SB_CSS = `
.oko-sysbar{ display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);
  height:28px; padding:0 var(--space-3); background:rgba(4,4,5,0.6); border-bottom:1px solid var(--border);
  backdrop-filter:var(--blur-soft); -webkit-backdrop-filter:var(--blur-soft);
  font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-data);
  color:var(--text-muted); text-transform:uppercase; }
.oko-sysbar__left{ display:flex; align-items:center; gap:var(--space-2); }
.oko-sysbar__right{ display:flex; align-items:center; gap:var(--space-3); }
.oko-sysbar__dot{ width:6px; height:6px; border-radius:50%; background:var(--red-500); color:var(--red-500);
  box-shadow:0 0 6px currentColor; animation:oko-sb-pulse 1600ms var(--ease-hal) infinite; }
.oko-sysbar__dot--ok{ background:var(--status-ok); color:var(--status-ok); }
.oko-sysbar__dot--warn{ background:var(--status-warn); color:var(--status-warn); }
.oko-sysbar__dot--idle{ background:var(--text-muted); color:var(--text-muted); box-shadow:none; animation:none; }
.oko-sysbar__state{ color:var(--text-secondary); }
.oko-sysbar__cell{ display:inline-flex; align-items:center; gap:4px; }
.oko-sysbar__cell svg, .oko-sysbar__cell i{ width:12px; height:12px; }
@keyframes oko-sb-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }
`;

const TONE = { active: '', ok: '--ok', warn: '--warn', idle: '--idle' };

function useSbCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-sysbar-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-sysbar-css';
    s.textContent = SB_CSS;
    document.head.appendChild(s);
  }, []);
}

export function SystemBar({
  state = 'GOTOWA', tone = 'active', time = '14:02', battery = '82%', signal = 'LTE', right, className = '', ...rest
}) {
  useSbCss();
  const cls = ['oko-sysbar', className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...rest}>
      <div className="oko-sysbar__left">
        <span className={`oko-sysbar__dot oko-sysbar__dot${TONE[tone] || ''}`} />
        <span>OKO</span>
        <span className="oko-sysbar__state">· {state}</span>
      </div>
      <div className="oko-sysbar__right">
        {right || (<>
          <span className="oko-sysbar__cell">{signal}</span>
          <span className="oko-sysbar__cell">{battery}</span>
          <span className="oko-sysbar__cell">{time}</span>
        </>)}
      </div>
    </div>
  );
}
