import React from 'react';

/* OKO MessageBubble — a single line in the transcript. The agent (author="oko") speaks
   as the machine: a small red lens marker, an uppercase mono byline, and a clinical
   message body — full width, no chat bubble. The user (author="user") gets a contained,
   right-aligned panel bubble in grotesque. This asymmetry is intentional: OKO is the
   system talking AT you; you are a guest in its interface. */

const MSG_CSS = `
.oko-msg{ display:flex; gap:var(--space-3); width:100%; }
.oko-msg--user{ justify-content:flex-end; }
.oko-msg__mark{ flex:0 0 auto; width:18px; height:18px; border-radius:50%; margin-top:2px;
  background:var(--lens-gradient); box-shadow:var(--glow-sm); position:relative; }
.oko-msg__mark::after{ content:''; position:absolute; top:30%; left:34%; width:4px; height:4px;
  border-radius:50%; background:rgba(255,255,255,0.7); }
.oko-msg__col{ display:flex; flex-direction:column; gap:var(--space-2); min-width:0; max-width:88%; }
.oko-msg__byline{ font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-label);
  text-transform:uppercase; color:var(--text-muted); display:flex; align-items:center; gap:var(--space-2); }
.oko-msg__time{ color:var(--clinical-700); }
.oko-msg__body{ font-family:var(--font-ui); font-size:var(--fs-body); line-height:var(--lh-body);
  color:var(--text-primary); text-wrap:pretty; }
.oko-msg--oko .oko-msg__body{ color:var(--clinical-100); }
.oko-msg--user .oko-msg__col{ align-items:flex-end; }
.oko-msg--user .oko-msg__body{ background:var(--panel-700); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:var(--space-3) var(--space-4); color:var(--text-primary); }
.oko-msg__cursor{ display:inline-block; width:8px; height:1.05em; vertical-align:-2px; margin-left:3px;
  background:var(--red-core); box-shadow:var(--glow-sm); animation:oko-msg-blink 1000ms steps(1,end) infinite; }
@keyframes oko-msg-blink{ 0%,100%{ opacity:1; } 50%{ opacity:0; } }
`;

function useMsgCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-msg-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-msg-css';
    s.textContent = MSG_CSS;
    document.head.appendChild(s);
  }, []);
}

export function MessageBubble({ author = 'oko', name, time, typing = false, className = '', children, ...rest }) {
  useMsgCss();
  const isOko = author === 'oko';
  const cls = ['oko-msg', `oko-msg--${author}`, className].filter(Boolean).join(' ');
  const byline = name || (isOko ? 'OKO' : 'TY');
  return (
    <div className={cls} {...rest}>
      {isOko && <span className="oko-msg__mark" />}
      <div className="oko-msg__col">
        <span className="oko-msg__byline">
          {byline}{time && <span className="oko-msg__time">· {time}</span>}
        </span>
        <div className="oko-msg__body">
          {children}
          {typing && <span className="oko-msg__cursor" />}
        </div>
      </div>
    </div>
  );
}
