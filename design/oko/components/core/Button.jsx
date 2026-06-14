import React from 'react';

/* OKO Button — clinical, machined controls. Primary is the only filled-red action on a
   screen (it carries the lens glow). Secondary is a hairline outline; ghost is bare.
   Labels are uppercase grotesque with wide tracking, like panel switches. */

const BTN_CSS = `
.oko-btn{ font-family:var(--font-ui); font-weight:var(--fw-medium); letter-spacing:var(--track-wide);
  display:inline-flex; align-items:center; justify-content:center; gap:var(--space-2);
  border:1px solid transparent; border-radius:var(--radius-md); cursor:pointer; white-space:nowrap;
  user-select:none; text-transform:uppercase; line-height:1;
  transition: background var(--dur-fast) var(--ease-hal), border-color var(--dur-fast) var(--ease-hal),
    color var(--dur-fast) var(--ease-hal), box-shadow var(--dur-fast) var(--ease-hal), transform var(--dur-instant); }
.oko-btn:focus-visible{ outline:none; box-shadow:0 0 0 2px var(--void-900), 0 0 0 3px var(--focus-ring); }
.oko-btn:active:not([disabled]){ transform: translateY(1px); }
.oko-btn[disabled]{ cursor:not-allowed; opacity:0.38; transform:none; box-shadow:none; }
.oko-btn--block{ width:100%; }
.oko-btn--sm{ height:var(--control-sm); padding:0 14px; font-size:var(--fs-xs); }
.oko-btn--md{ height:var(--control-md); padding:0 18px; font-size:var(--fs-sm); }
.oko-btn--lg{ height:var(--control-lg); padding:0 26px; font-size:var(--fs-body); }
.oko-btn--primary{ background:var(--red-500); color:#fff; border-color:var(--red-500); box-shadow:var(--glow-sm); }
.oko-btn--primary:hover:not([disabled]){ background:var(--red-core); border-color:var(--red-core); box-shadow:var(--glow-md); }
.oko-btn--primary:active:not([disabled]){ background:var(--red-600); }
.oko-btn--secondary{ background:transparent; color:var(--text-primary); border-color:var(--line-2); }
.oko-btn--secondary:hover:not([disabled]){ border-color:var(--line-3); background:rgba(244,244,242,0.045); }
.oko-btn--ghost{ background:transparent; color:var(--text-secondary); border-color:transparent; }
.oko-btn--ghost:hover:not([disabled]){ color:var(--text-primary); background:rgba(244,244,242,0.05); }
.oko-btn__spin{ width:13px; height:13px; border-radius:50%; border:2px solid currentColor;
  border-top-color:transparent; animation:oko-btn-spin 720ms linear infinite; }
@keyframes oko-btn-spin{ to{ transform:rotate(360deg);} }
`;

function useBtnCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-btn-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-btn-css';
    s.textContent = BTN_CSS;
    document.head.appendChild(s);
  }, []);
}

export function Button({
  variant = 'primary', size = 'md', block = false, loading = false,
  icon, iconRight, disabled, className = '', children, ...rest
}) {
  useBtnCss();
  const cls = ['oko-btn', `oko-btn--${variant}`, `oko-btn--${size}`, block ? 'oko-btn--block' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="oko-btn__spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}
