import React from 'react';

/* OKO StatusChip — a clinical status readout: a small dot + uppercase mono label.
   tones map to the rationed status palette. `pulse` makes the dot breathe (live signal). */

const CHIP_CSS = `
.oko-chip{ display:inline-flex; align-items:center; gap:var(--space-2); height:22px; padding:0 10px;
  border:1px solid var(--border); border-radius:var(--radius-pill); background:rgba(244,244,242,0.03);
  font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-data);
  text-transform:uppercase; color:var(--text-secondary); white-space:nowrap; }
.oko-chip--solid{ border-color:transparent; }
.oko-chip__dot{ width:7px; height:7px; border-radius:50%; flex:0 0 auto; box-shadow:0 0 6px currentColor; }
.oko-chip--ok    .oko-chip__dot{ background:var(--status-ok); color:var(--status-ok); }
.oko-chip--warn  .oko-chip__dot{ background:var(--status-warn); color:var(--status-warn); }
.oko-chip--danger .oko-chip__dot{ background:var(--status-danger); color:var(--status-danger); }
.oko-chip--info  .oko-chip__dot{ background:var(--status-info); color:var(--status-info); }
.oko-chip--neutral .oko-chip__dot{ background:var(--text-muted); color:var(--text-muted); box-shadow:none; }
.oko-chip--ok.oko-chip--solid{ background:rgba(67,210,126,0.12); color:var(--status-ok); }
.oko-chip--warn.oko-chip--solid{ background:rgba(244,179,42,0.12); color:var(--status-warn); }
.oko-chip--danger.oko-chip--solid{ background:var(--red-tint); color:var(--red-core); }
.oko-chip--info.oko-chip--solid{ background:rgba(91,200,216,0.12); color:var(--status-info); }
.oko-chip__dot--pulse{ animation:oko-chip-pulse 1400ms var(--ease-hal) infinite; }
@keyframes oko-chip-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }
`;

function useChipCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-chip-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-chip-css';
    s.textContent = CHIP_CSS;
    document.head.appendChild(s);
  }, []);
}

export function StatusChip({ tone = 'neutral', solid = false, pulse = false, dot = true, className = '', children, ...rest }) {
  useChipCss();
  const cls = ['oko-chip', `oko-chip--${tone}`, solid ? 'oko-chip--solid' : '', className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className={`oko-chip__dot${pulse ? ' oko-chip__dot--pulse' : ''}`} />}
      {children}
    </span>
  );
}
