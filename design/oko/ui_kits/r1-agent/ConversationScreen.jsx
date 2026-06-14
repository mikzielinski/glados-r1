/* The live conversation transcript with a composer at the bottom. */

function ConversationScreen({ messages, onSend, onMic, draft, setDraft }) {
  const { MessageBubble, IconButton } = OKO;
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <ScreenShell state="ROZMOWA" tone="active">
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} author={m.author} time={m.time} typing={m.typing}>{m.text}</MessageBubble>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          borderTop: '1px solid var(--border)', background: 'rgba(4,4,5,0.5)',
          backdropFilter: 'var(--blur-soft)',
        }}
      >
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', height: 34, padding: '0 12px',
          background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)',
        }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Wydaj polecenie…"
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)',
            }}
          />
        </div>
        {draft.trim()
          ? <IconButton type="submit" variant="solid" shape="circle" label="Wyślij">{Ic('arrow-up', 16)}</IconButton>
          : <IconButton type="button" variant="solid" shape="circle" label="Mów" onClick={onMic}>{Ic('mic', 16)}</IconButton>}
      </form>
    </ScreenShell>
  );
}

Object.assign(window, { ConversationScreen });
