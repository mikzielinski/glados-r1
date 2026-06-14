import React from 'react';

/* OKO Toggle — a hardware-style switch. Recessed track; when ON the track lights red
   and the knob carries a faint glow (a circuit being closed). Optional label + sublabel. */

const TG_CSS = `
.oko-toggle{ display:inline-flex; align-items:center; gap:var(--space-3); cursor:pointer; user-select:none; }
.oko-toggle--disabled{ cursor:not-allowed; opacity:0.4; }
.oko-toggle__track{ position:relative; width:42px; height:24px; flex:0 0 auto; border-radius:var(--radius-pill);
  background:var(--surface-inset); border:1px solid var(--line-2); box-shadow:inset 0 1px 3px rgba(0,0,0,0.6);
  transition:background var(--dur-base) var(--ease-hal), border-color var(--dur-base) var(--ease-hal), box-shadow var(--dur-base) var(--ease-hal); }
.oko-toggle__knob{ position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%;
  background:var(--clinical-300); box-shadow:0 1px 2px rgba(0,0,0,0.6);
  transition:transform var(--dur-base) var(--ease-out-soft), background var(--dur-base) var(--ease-hal); }
.oko-toggle__input{ position:absolute; opacity:0; width:0; height:0; }
.oko-toggle__input:checked + .oko-toggle__track{ background:var(--red-700); border-color:var(--red-500); box-shadow:inset 0 0 8px rgba(226,18,42,0.5), var(--glow-sm); }
.oko-toggle__input:checked + .oko-toggle__track .oko-toggle__knob{ transform:translateX(18px); background:#fff; }
.oko-toggle__input:focus-visible + .oko-toggle__track{ outline:none; box-shadow:0 0 0 2px var(--void-900), 0 0 0 3px var(--focus-ring); }
.oko-toggle__text{ display:flex; flex-direction:column; gap:2px; }
.oko-toggle__label{ font-family:var(--font-ui); font-size:var(--fs-sm); color:var(--text-primary); }
.oko-toggle__sub{ font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-data); color:var(--text-muted); }
`;

function useToggleCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-toggle-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-toggle-css';
    s.textContent = TG_CSS;
    document.head.appendChild(s);
  }, []);
}

export function Toggle({ label, sublabel, checked, defaultChecked, onChange, disabled = false, className = '', id, ...rest }) {
  useToggleCss();
  const cls = ['oko-toggle', disabled ? 'oko-toggle--disabled' : '', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input
        type="checkbox" className="oko-toggle__input" id={id}
        checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled}
        {...rest}
      />
      <span className="oko-toggle__track"><span className="oko-toggle__knob" /></span>
      {(label || sublabel) && (
        <span className="oko-toggle__text">
          {label && <span className="oko-toggle__label">{label}</span>}
          {sublabel && <span className="oko-toggle__sub">{sublabel}</span>}
        </span>
      )}
    </label>
  );
}
