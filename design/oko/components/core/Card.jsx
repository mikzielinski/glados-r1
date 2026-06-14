import React from 'react';

/* OKO Card — a machined panel. Hairline-etched seam, faint top highlight, deep matte
   fill. NOT a soft rounded card: tight radius, no colored left-border gimmick. Optional
   clinical header label (uppercase mono) with right-aligned actions. `variant="glass"`
   for floating overlays (blur), `inset` for recessed wells. */

const CARD_CSS = `
.oko-card{ background:var(--surface-card); border:1px solid var(--border);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-panel); color:var(--text-primary);
  position:relative; overflow:hidden; }
.oko-card::before{ content:''; position:absolute; inset:0 0 auto 0; height:1px;
  background:linear-gradient(90deg, transparent, rgba(244,244,242,0.10), transparent); }
.oko-card--inset{ background:var(--surface-inset); box-shadow:var(--inset-screen); }
.oko-card--glass{ background:var(--glass-bg); border-color:var(--glass-border);
  backdrop-filter:var(--blur-glass); -webkit-backdrop-filter:var(--blur-glass); box-shadow:var(--shadow-raised); }
.oko-card--flush{ padding:0; }
.oko-card__head{ display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);
  padding:var(--space-3) var(--space-4); border-bottom:1px solid var(--border); }
.oko-card__label{ font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-label);
  text-transform:uppercase; color:var(--text-muted); display:inline-flex; align-items:center; gap:var(--space-2); }
.oko-card__body{ padding:var(--space-4); }
`;

function useCardCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-card-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-card-css';
    s.textContent = CARD_CSS;
    document.head.appendChild(s);
  }, []);
}

export function Card({
  variant = 'default', label, actions, padded = true, className = '', style, children, ...rest
}) {
  useCardCss();
  const cls = ['oko-card', variant !== 'default' ? `oko-card--${variant}` : '', !padded ? 'oko-card--flush' : '', className]
    .filter(Boolean).join(' ');
  return (
    <div className={cls} style={style} {...rest}>
      {(label || actions) && (
        <div className="oko-card__head">
          <span className="oko-card__label">{label}</span>
          {actions}
        </div>
      )}
      {padded ? <div className="oko-card__body">{children}</div> : children}
    </div>
  );
}
