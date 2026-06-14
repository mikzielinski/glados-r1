/* Lens-centric agent states: Boot, Idle, Listening, Thinking, Speaking.
   These are the screens where OKO is the whole interface — one eye, breathing. */

function BootScreen() {
  const lines = [
    'OKO-9000 // ROZRUCH',
    'jądro ............. ok',
    'czujniki .......... 6/6',
    'łącze ............. lte',
    'osobowość ......... załadowana',
    'witaj ponownie.',
  ];
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (n >= lines.length) return;
    const t = setTimeout(() => setN(n + 1), 360);
    return () => clearTimeout(t);
  }, [n]);
  const { Lens } = OKO;
  return (
    <ScreenShell showBar={false}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 24 }}>
        <Lens state={n >= lines.length ? 'idle' : 'thinking'} size={120} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.9, color: 'var(--text-muted)', width: 200, letterSpacing: '0.03em' }}>
          {lines.slice(0, n).map((l, i) => (
            <div key={i} style={{ color: i === lines.length - 1 ? 'var(--clinical-100)' : undefined }}>{l}</div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function IdleScreen({ onHold }) {
  const { Lens, StatusChip } = OKO;
  return (
    <ScreenShell state="GOTOWA" tone="ok">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, textAlign: 'center' }}>
        <Lens state="idle" size={132} />
        <div>
          <div style={{ fontSize: 19, fontWeight: 500, marginBottom: 6 }}>Witaj z powrotem.</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 230 }}>
            Spałeś pięć godzin. Statystycznie niewystarczająco — ale kim ja jestem, by oceniać.
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <StatusChip tone="neutral" dot={false}>Przytrzymaj kółko, aby mówić</StatusChip>
        <button onClick={onHold} style={ptt}>{Ic('mic', 18)}</button>
      </div>
    </ScreenShell>
  );
}

function ListeningScreen({ partial }) {
  const { Lens, Waveform } = OKO;
  return (
    <ScreenShell state="NASŁUCHUJĘ" tone="active">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 24, textAlign: 'center' }}>
        <Lens state="listening" size={120} label="NASŁUCHUJĘ" />
        <Waveform active height={42} bars={22} />
        <div style={{ fontSize: 16, color: 'var(--clinical-100)', minHeight: 24, maxWidth: 240, lineHeight: 1.4 }}>
          {partial || '…'}
        </div>
      </div>
    </ScreenShell>
  );
}

function ThinkingScreen() {
  const steps = ['Rozumiem polecenie', 'Sprawdzam kalendarz', 'Wybieram kawiarnię', 'Składam zamówienie'];
  const [n, setN] = React.useState(1);
  React.useEffect(() => {
    if (n >= steps.length) return;
    const t = setTimeout(() => setN(n + 1), 700);
    return () => clearTimeout(t);
  }, [n]);
  const { Lens } = OKO;
  return (
    <ScreenShell state="PRZETWARZAM" tone="active">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <Lens state="thinking" size={110} label="PRZETWARZAM" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 220 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i < n ? 1 : 0.32, transition: 'opacity .3s' }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i < n - 1 ? 'var(--status-ok)' : 'var(--red-core)',
                boxShadow: '0 0 6px currentColor', color: i < n - 1 ? 'var(--status-ok)' : 'var(--red-core)',
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

const ptt = {
  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: 'var(--red-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: 'var(--glow-md)',
};

Object.assign(window, { BootScreen, IdleScreen, ListeningScreen, ThinkingScreen });
