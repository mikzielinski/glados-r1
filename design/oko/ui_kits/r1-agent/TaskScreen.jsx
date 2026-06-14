/* Task + tool execution — OKO doing things in the world. A live checklist of tool
   calls with statuses, then a result card. */

function TaskScreen() {
  const tasks = [
    { label: 'kalendarz.czytaj', detail: 'znaleziono 1 zdarzenie', dur: 600 },
    { label: 'mapy.trasa', detail: 'biuro · 14 min', dur: 900 },
    { label: 'kawa.zamów', detail: 'duża czarna · 12 zł', dur: 1100 },
    { label: 'powiadom.użytkownik', detail: 'wysłano', dur: 700 },
  ];
  const [done, setDone] = React.useState(0);
  React.useEffect(() => {
    if (done >= tasks.length) return;
    const t = setTimeout(() => setDone(done + 1), tasks[done].dur);
    return () => clearTimeout(t);
  }, [done]);
  const { Lens, StatusChip, Card } = OKO;
  const finished = done >= tasks.length;

  return (
    <ScreenShell state={finished ? 'GOTOWE' : 'WYKONUJĘ'} tone={finished ? 'ok' : 'active'}>
      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Lens state={finished ? 'idle' : 'thinking'} size={48} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{finished ? 'Załatwione.' : 'Realizuję poranek.'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {done}/{tasks.length} kroków
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t, i) => {
            const state = i < done ? 'done' : i === done ? 'active' : 'pending';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '9px 11px', borderRadius: 6,
                background: state === 'active' ? 'var(--red-tint)' : 'var(--surface-card)',
                border: '1px solid', borderColor: state === 'active' ? 'var(--red-700)' : 'var(--border)',
                opacity: state === 'pending' ? 0.4 : 1, transition: 'all .3s',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                  {t.label}
                </span>
                {state === 'done' && <StatusChip tone="ok" dot>{t.detail}</StatusChip>}
                {state === 'active' && <StatusChip tone="danger" pulse>…</StatusChip>}
                {state === 'pending' && <StatusChip tone="neutral" dot={false}>oczekuje</StatusChip>}
              </div>
            );
          })}
        </div>

        {finished && (
          <Card label="PODSUMOWANIE" style={{ marginTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--clinical-100)', lineHeight: 1.5 }}>
              Kawa w drodze, wyjście za 9 minut. Nie podziękowałeś, ale rejestruję sam zamiar.
            </div>
          </Card>
        )}
      </div>
    </ScreenShell>
  );
}

Object.assign(window, { TaskScreen });
