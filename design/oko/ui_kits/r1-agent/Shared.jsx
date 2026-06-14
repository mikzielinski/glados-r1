/* Shared helpers for the R1 Agent kit. ScreenShell gives every screen the same
   320px-wide column with an optional SystemBar and a scrollable body. */

const OKO = window.OKODesignSystem_f53d78;

function ScreenShell({ state = 'GOTOWA', tone = 'active', showBar = true, bar, children, bodyStyle }) {
  const { SystemBar } = OKO;
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(130% 100% at 50% 0%, #0c0d11 0%, #050506 60%, #040405 100%)',
      color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
    }}>
      {showBar && (bar || <SystemBar state={state} tone={tone} time="14:02" battery="82%" signal="LTE" />)}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
}

// tiny lucide icon helper
function Ic(name, size) {
  return React.createElement('i', { 'data-lucide': name, style: { width: size || 15, height: size || 15 } });
}

Object.assign(window, { OKO, ScreenShell, Ic });
