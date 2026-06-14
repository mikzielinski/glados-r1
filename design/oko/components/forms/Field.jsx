import React from 'react';

/* OKO Field — a clinical text input. Recessed dark well, uppercase mono label sitting
   above, monospace value (it's a data-entry instrument). Red focus seam. Optional
   leading icon, hint and error state. */

const FIELD_CSS = `
.oko-field{ display:flex; flex-direction:column; gap:var(--space-2); width:100%; }
.oko-field__label{ font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-label);
  text-transform:uppercase; color:var(--text-muted); }
.oko-field__wrap{ display:flex; align-items:center; gap:var(--space-2); height:var(--control-md);
  padding:0 var(--space-3); background:var(--surface-inset); border:1px solid var(--border);
  border-radius:var(--radius-md); box-shadow:inset 0 1px 3px rgba(0,0,0,0.5);
  transition:border-color var(--dur-fast) var(--ease-hal), box-shadow var(--dur-fast) var(--ease-hal); }
.oko-field__wrap:focus-within{ border-color:var(--red-500); box-shadow:inset 0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px var(--red-500), var(--glow-sm); }
.oko-field--error .oko-field__wrap{ border-color:var(--red-600); }
.oko-field__icon{ color:var(--text-muted); display:inline-flex; }
.oko-field__icon svg, .oko-field__icon i{ width:15px; height:15px; }
.oko-field__input{ flex:1; min-width:0; background:transparent; border:none; outline:none;
  font-family:var(--font-data); font-size:var(--fs-sm); color:var(--text-primary); letter-spacing:var(--track-data); }
.oko-field__input::placeholder{ color:var(--text-muted); }
.oko-field__input:disabled{ color:var(--text-disabled); cursor:not-allowed; }
.oko-field__hint{ font-family:var(--font-data); font-size:var(--fs-xs); color:var(--text-muted); letter-spacing:var(--track-data); }
.oko-field--error .oko-field__hint{ color:var(--red-core); }
`;

function useFieldCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-field-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-field-css';
    s.textContent = FIELD_CSS;
    document.head.appendChild(s);
  }, []);
}

export function Field({ label, hint, error = false, icon, className = '', id, ...inputProps }) {
  useFieldCss();
  const fieldId = id || (label ? `oko-f-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const cls = ['oko-field', error ? 'oko-field--error' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {label && <label className="oko-field__label" htmlFor={fieldId}>{label}</label>}
      <div className="oko-field__wrap">
        {icon && <span className="oko-field__icon">{icon}</span>}
        <input id={fieldId} className="oko-field__input" {...inputProps} />
      </div>
      {hint && <span className="oko-field__hint">{hint}</span>}
    </div>
  );
}
