/* App — orchestrates the R1 agent flow and the screen navigator. */

const SCREENS = [
  { id: 'boot', label: 'Rozruch' },
  { id: 'idle', label: 'Bezczynność' },
  { id: 'listening', label: 'Nasłuch' },
  { id: 'thinking', label: 'Myślenie' },
  { id: 'conversation', label: 'Rozmowa' },
  { id: 'task', label: 'Zadanie' },
  { id: 'settings', label: 'System' },
];

function App() {
  const [screen, setScreen] = React.useState('idle');
  const [partial, setPartial] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [notif, setNotif] = React.useState(false);
  const [messages, setMessages] = React.useState([
    { author: 'oko', time: '14:01', text: 'Dzień dobry. Wykryłam, że się obudziłeś. Brawo.' },
    { author: 'user', time: '14:01', text: 'Co mam dziś rano?' },
    { author: 'oko', time: '14:02', text: 'Spotkanie o 14:30 i niepokojąco pusty kalendarz poza nim. Mam coś zaproponować?' },
  ]);

  // boot auto-advances to idle
  React.useEffect(() => {
    if (screen !== 'boot') return;
    const t = setTimeout(() => setScreen('idle'), 2600);
    return () => clearTimeout(t);
  }, [screen]);

  // refresh lucide icons on every screen change
  React.useEffect(() => {
    const t = setTimeout(() => window.lucide && window.lucide.createIcons(), 40);
    return () => clearTimeout(t);
  }, [screen, messages, draft]);

  // PTT / mic → listening → thinking → conversation
  function startVoice() {
    const phrase = 'Zamów mi kawę i powiedz, kiedy wychodzić';
    setScreen('listening');
    setPartial('');
    let i = 0;
    const words = phrase.split(' ');
    const tick = () => {
      i++;
      setPartial(words.slice(0, i).join(' '));
      if (i < words.length) setTimeout(tick, 240);
      else setTimeout(() => {
        setMessages((m) => [...m, { author: 'user', time: '14:03', text: phrase }]);
        setScreen('thinking');
        setTimeout(() => {
          setMessages((m) => [...m, { author: 'oko', time: '14:03', text: 'Zamówione. Duża czarna. Wychodzisz za 9 minut — proponuję ruszyć teraz, zanim znajdziesz wymówkę.' }]);
          setScreen('conversation');
        }, 2600);
      }, 500);
    };
    setTimeout(tick, 400);
  }

  function sendDraft() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    setMessages((m) => [...m, { author: 'user', time: '14:04', text }]);
    setTimeout(() => {
      setMessages((m) => [...m, { author: 'oko', time: '14:04', text: 'Przyjęłam. Wykonuję — w przeciwieństwie do twoich postanowień.', typing: false }]);
    }, 900);
  }

  let view;
  if (screen === 'boot') view = <BootScreen />;
  else if (screen === 'idle') view = <IdleScreen onHold={startVoice} />;
  else if (screen === 'listening') view = <ListeningScreen partial={partial} />;
  else if (screen === 'thinking') view = <ThinkingScreen />;
  else if (screen === 'conversation') view = <ConversationScreen messages={messages} draft={draft} setDraft={setDraft} onSend={sendDraft} onMic={startVoice} />;
  else if (screen === 'task') view = <TaskScreen />;
  else if (screen === 'settings') view = <SettingsScreen />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
      <DeviceFrame onPTT={startVoice} listening={screen === 'listening'}>
        {view}
        {notif && <NotifOverlay onClose={() => setNotif(false)} onOpen={() => { setNotif(false); setScreen('conversation'); }} />}
      </DeviceFrame>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 420 }}>
        {SCREENS.map((s) => (
          <button key={s.id} onClick={() => setScreen(s.id)} className={'navchip' + (screen === s.id ? ' on' : '')}>
            {s.label}
          </button>
        ))}
        <button onClick={() => setNotif(true)} className="navchip alert">Alert</button>
      </div>
    </div>
  );
}

function NotifOverlay({ onClose, onOpen }) {
  const { Card, Button, Lens } = OKO;
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end',
      background: 'linear-gradient(to top, rgba(4,4,5,0.7), transparent 55%)', padding: 14,
      animation: 'okoNotifIn .4s var(--ease-out-soft)',
    }}>
      <Card variant="glass" style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Lens state="alert" size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--red-core)', marginBottom: 5 }}>OKO · TERAZ</div>
            <div style={{ fontSize: 13.5, color: 'var(--clinical-100)', lineHeight: 1.45, marginBottom: 12 }}>
              Wykryłam korek na twojej trasie. Wyjdź dwie minuty wcześniej. Wiem, że tego nie zrobisz.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="primary" onClick={onOpen}>Otwórz</Button>
              <Button size="sm" variant="ghost" onClick={onClose}>Zignoruj</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
setTimeout(() => window.lucide && window.lucide.createIcons(), 80);
