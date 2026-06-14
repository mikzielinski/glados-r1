import React from 'react';

/* OKO IconButton — a single-icon control. Square with tight radius by default, or
   round (`shape="circle"`) for the push-to-talk / lens-adjacent actions. */

const IB_CSS = `
.oko-ib{ display:inline-flex; align-items:center; justify-content:center; cursor:pointer;
  border:1px solid transparent; border-radius:var(--radius-md); color:var(--text-secondary);
  background:transparent; transition: background var(--dur-fast) var(--ease-hal),
    color var(--dur-fast) var(--ease-hal), border-color var(--dur-fast) var(--ease-hal),
    box-shadow var(--dur-fast) var(--ease-hal), transform var(--dur-instant); }
.oko-ib:focus-visible{ outline:none; box-shadow:0 0 0 2px var(--void-900), 0 0 0 3px var(--focus-ring); }
.oko-ib:active:not([disabled]){ transform: translateY(1px); }
.oko-ib[disabled]{ cursor:not-allowed; opacity:0.38; }
.oko-ib--circle{ border-radius:var(--radius-circle); }
.oko-ib--sm{ width:30px; height:30px; }
.oko-ib--md{ width:38px; height:38px; }
.oko-ib--lg{ width:48px; height:48px; }
.oko-ib--ghost:hover:not([disabled]){ color:var(--text-primary); background:rgba(244,244,242,0.06); }
.oko-ib--outline{ border-color:var(--line-2); }
.oko-ib--outline:hover:not([disabled]){ color:var(--text-primary); border-color:var(--line-3); background:rgba(244,244,242,0.04); }
.oko-ib--solid{ background:var(--red-500); color:#fff; box-shadow:var(--glow-sm); }
.oko-ib--solid:hover:not([disabled]){ background:var(--red-core); box-shadow:var(--glow-md); }
.oko-ib--solid:active:not([disabled]){ background:var(--red-600); }
.oko-ib svg, .oko-ib i{ width:1.05em; height:1.05em; }
`;

function useIbCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-ib-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-ib-css';
    s.textContent = IB_CSS;
    document.head.appendChild(s);
  }, []);
}

export function IconButton({
  variant = 'ghost', size = 'md', shape = 'square', label, className = '', children, ...rest
}) {
  useIbCss();
  const cls = ['oko-ib', `oko-ib--${variant}`, `oko-ib--${size}`, shape === 'circle' ? 'oko-ib--circle' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
