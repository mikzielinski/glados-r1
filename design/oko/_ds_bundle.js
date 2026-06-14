/* @ds-bundle: {"format":3,"namespace":"OKODesignSystem_f53d78","components":[{"name":"MessageBubble","sourcePath":"components/conversation/MessageBubble.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatusChip","sourcePath":"components/core/StatusChip.jsx"},{"name":"Lens","sourcePath":"components/feedback/Lens.jsx"},{"name":"Waveform","sourcePath":"components/feedback/Waveform.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Toggle","sourcePath":"components/forms/Toggle.jsx"},{"name":"SystemBar","sourcePath":"components/navigation/SystemBar.jsx"}],"sourceHashes":{"components/conversation/MessageBubble.jsx":"59efa400cdf4","components/core/Button.jsx":"9e9eb31e083d","components/core/Card.jsx":"e4c250fec048","components/core/IconButton.jsx":"a6a09ec0406d","components/core/StatusChip.jsx":"fc9a2077a23c","components/feedback/Lens.jsx":"d83d481212e7","components/feedback/Waveform.jsx":"2483ec979aa7","components/forms/Field.jsx":"74486f507d87","components/forms/Toggle.jsx":"0e668e19fbb9","components/navigation/SystemBar.jsx":"1c7298c7ed07","ui_kits/r1-agent/App.jsx":"91095fca670a","ui_kits/r1-agent/ConversationScreen.jsx":"a2ad706e7d6b","ui_kits/r1-agent/DeviceFrame.jsx":"cfa44702aeff","ui_kits/r1-agent/LensScreens.jsx":"6234b4e8daf7","ui_kits/r1-agent/SettingsScreen.jsx":"cd859b2dec5d","ui_kits/r1-agent/Shared.jsx":"f322c976bc7b","ui_kits/r1-agent/TaskScreen.jsx":"34aad6240ce4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OKODesignSystem_f53d78 = window.OKODesignSystem_f53d78 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/conversation/MessageBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function MessageBubble({
  author = 'oko',
  name,
  time,
  typing = false,
  className = '',
  children,
  ...rest
}) {
  useMsgCss();
  const isOko = author === 'oko';
  const cls = ['oko-msg', `oko-msg--${author}`, className].filter(Boolean).join(' ');
  const byline = name || (isOko ? 'OKO' : 'TY');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), isOko && /*#__PURE__*/React.createElement("span", {
    className: "oko-msg__mark"
  }), /*#__PURE__*/React.createElement("div", {
    className: "oko-msg__col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "oko-msg__byline"
  }, byline, time && /*#__PURE__*/React.createElement("span", {
    className: "oko-msg__time"
  }, "\xB7 ", time)), /*#__PURE__*/React.createElement("div", {
    className: "oko-msg__body"
  }, children, typing && /*#__PURE__*/React.createElement("span", {
    className: "oko-msg__cursor"
  }))));
}
Object.assign(__ds_scope, { MessageBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/conversation/MessageBubble.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  icon,
  iconRight,
  disabled,
  className = '',
  children,
  ...rest
}) {
  useBtnCss();
  const cls = ['oko-btn', `oko-btn--${variant}`, `oko-btn--${size}`, block ? 'oko-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    disabled: disabled || loading
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "oko-btn__spin"
  }) : icon, children, !loading && iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* OKO Card — a machined panel. Hairline-etched seam, faint top highlight, deep matte
   fill. NOT a soft rounded card: tight radius, no colored left-border gimmick. Optional
   clinical header label (uppercase mono) with right-aligned actions. `variant="glass"`
   for floating overlays (blur), `inset` for recessed wells. */

const CARD_CSS = `
.oko-card{ background:var(--surface-card); border:1px solid var(--border);
  border-radius:var(--radius-lg); box-shadow:var(--shadow-panel); color:var(--text-primary);
  position:relative; overflow:hidden; }
.oko-card::before{ content:''; position:absolute; inset:0 0 auto 0; height:1px;
  background:linear-gradient(90deg, transparent, rgba(244,244,242,0.10), transparent); }
.oko-card--inset{ background:var(--surface-inset); box-shadow:var(--inset-screen); }
.oko-card--glass{ background:var(--glass-bg); border-color:var(--glass-border);
  backdrop-filter:var(--blur-glass); -webkit-backdrop-filter:var(--blur-glass); box-shadow:var(--shadow-raised); }
.oko-card--flush{ padding:0; }
.oko-card__head{ display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);
  padding:var(--space-3) var(--space-4); border-bottom:1px solid var(--border); }
.oko-card__label{ font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-label);
  text-transform:uppercase; color:var(--text-muted); display:inline-flex; align-items:center; gap:var(--space-2); }
.oko-card__body{ padding:var(--space-4); }
`;
function useCardCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-card-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-card-css';
    s.textContent = CARD_CSS;
    document.head.appendChild(s);
  }, []);
}
function Card({
  variant = 'default',
  label,
  actions,
  padded = true,
  className = '',
  style,
  children,
  ...rest
}) {
  useCardCss();
  const cls = ['oko-card', variant !== 'default' ? `oko-card--${variant}` : '', !padded ? 'oko-card--flush' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    style: style
  }, rest), (label || actions) && /*#__PURE__*/React.createElement("div", {
    className: "oko-card__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "oko-card__label"
  }, label), actions), padded ? /*#__PURE__*/React.createElement("div", {
    className: "oko-card__body"
  }, children) : children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function IconButton({
  variant = 'ghost',
  size = 'md',
  shape = 'square',
  label,
  className = '',
  children,
  ...rest
}) {
  useIbCss();
  const cls = ['oko-ib', `oko-ib--${variant}`, `oko-ib--${size}`, shape === 'circle' ? 'oko-ib--circle' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-label": label,
    title: label
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* OKO StatusChip — a clinical status readout: a small dot + uppercase mono label.
   tones map to the rationed status palette. `pulse` makes the dot breathe (live signal). */

const CHIP_CSS = `
.oko-chip{ display:inline-flex; align-items:center; gap:var(--space-2); height:22px; padding:0 10px;
  border:1px solid var(--border); border-radius:var(--radius-pill); background:rgba(244,244,242,0.03);
  font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-data);
  text-transform:uppercase; color:var(--text-secondary); white-space:nowrap; }
.oko-chip--solid{ border-color:transparent; }
.oko-chip__dot{ width:7px; height:7px; border-radius:50%; flex:0 0 auto; box-shadow:0 0 6px currentColor; }
.oko-chip--ok    .oko-chip__dot{ background:var(--status-ok); color:var(--status-ok); }
.oko-chip--warn  .oko-chip__dot{ background:var(--status-warn); color:var(--status-warn); }
.oko-chip--danger .oko-chip__dot{ background:var(--status-danger); color:var(--status-danger); }
.oko-chip--info  .oko-chip__dot{ background:var(--status-info); color:var(--status-info); }
.oko-chip--neutral .oko-chip__dot{ background:var(--text-muted); color:var(--text-muted); box-shadow:none; }
.oko-chip--ok.oko-chip--solid{ background:rgba(67,210,126,0.12); color:var(--status-ok); }
.oko-chip--warn.oko-chip--solid{ background:rgba(244,179,42,0.12); color:var(--status-warn); }
.oko-chip--danger.oko-chip--solid{ background:var(--red-tint); color:var(--red-core); }
.oko-chip--info.oko-chip--solid{ background:rgba(91,200,216,0.12); color:var(--status-info); }
.oko-chip__dot--pulse{ animation:oko-chip-pulse 1400ms var(--ease-hal) infinite; }
@keyframes oko-chip-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }
`;
function useChipCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-chip-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-chip-css';
    s.textContent = CHIP_CSS;
    document.head.appendChild(s);
  }, []);
}
function StatusChip({
  tone = 'neutral',
  solid = false,
  pulse = false,
  dot = true,
  className = '',
  children,
  ...rest
}) {
  useChipCss();
  const cls = ['oko-chip', `oko-chip--${tone}`, solid ? 'oko-chip--solid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: `oko-chip__dot${pulse ? ' oko-chip__dot--pulse' : ''}`
  }), children);
}
Object.assign(__ds_scope, { StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusChip.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Lens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* OKO Lens — the single all-seeing eye. The one element in the system that emits light.
   It is never fully "off" while the agent is awake: at idle it breathes on a long, calm
   cycle. State drives glow, motion and the rotating "thinking" arc. */

const LENS_CSS = `
@keyframes oko-breath { 0%,100%{ transform:scale(0.975);} 50%{ transform:scale(1.025);} }
@keyframes oko-pulse  { 0%,100%{ opacity:0.55; transform:scale(1);} 50%{ opacity:1; transform:scale(1.08);} }
@keyframes oko-spin   { to { transform: rotate(360deg);} }
@keyframes oko-flicker{ 0%,100%{opacity:1;} 46%{opacity:.82;} 50%{opacity:.55;} 54%{opacity:.9;} }
@keyframes oko-alert  { 0%,100%{ filter:brightness(1);} 50%{ filter:brightness(1.5);} }
`;
function useLensCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-lens-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-lens-css';
    s.textContent = LENS_CSS;
    document.head.appendChild(s);
  }, []);
}
function Lens({
  state = 'idle',
  size = 160,
  amplitude = 0.5,
  label,
  style,
  ...rest
}) {
  useLensCss();
  const dim = state === 'offline';
  const housing = Math.round(size);
  const disc = Math.round(size * 0.74);

  // breathing/pulse motion on the lens disc
  let discAnim = 'oko-breath var(--breath) var(--ease-hal) infinite';
  if (state === 'listening') discAnim = 'oko-breath var(--pulse) var(--ease-hal) infinite';
  if (state === 'thinking') discAnim = 'oko-flicker 2400ms steps(1,end) infinite, oko-breath var(--breath) var(--ease-hal) infinite';
  if (state === 'alert') discAnim = 'oko-alert 700ms var(--ease-hal) infinite';
  if (dim) discAnim = 'none';

  // glow intensity by state
  const glow = {
    idle: 'var(--glow-md)',
    listening: 'var(--glow-lg)',
    thinking: 'var(--glow-md)',
    speaking: 'var(--glow-lg)',
    alert: '0 0 36px var(--red-glow), 0 0 120px rgba(226,18,42,0.45)',
    offline: 'none'
  }[state] || 'var(--glow-md)';

  // speaking scales the hot core by amplitude (0..1)
  const coreScale = state === 'speaking' ? 0.7 + Math.max(0, Math.min(1, amplitude)) * 0.6 : 1;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: housing,
      height: housing
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 38%, #15171c, #08090b 70%, #040405)',
      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(244,244,242,0.05)'
    }
  }), state === 'thinking' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: housing * 0.06,
      borderRadius: '50%',
      background: 'conic-gradient(from 0deg, transparent 0deg, transparent 250deg, var(--red-500) 320deg, var(--red-core) 360deg)',
      WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
      mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
      animation: 'oko-spin 1600ms linear infinite',
      opacity: 0.9
    }
  }), state === 'listening' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: housing * 0.02,
      borderRadius: '50%',
      border: '1px solid var(--red-500)',
      animation: 'oko-pulse var(--pulse) var(--ease-hal) infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: disc,
      height: disc,
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      background: dim ? 'var(--lens-gradient-dim)' : 'var(--lens-gradient)',
      boxShadow: glow,
      animation: discAnim,
      transition: 'box-shadow var(--dur-slow) var(--ease-hal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '42%',
      left: '50%',
      width: disc * 0.26,
      height: disc * 0.26,
      transform: `translate(-50%, -50%) scale(${coreScale})`,
      borderRadius: '50%',
      background: dim ? 'rgba(110,32,24,0.6)' : 'radial-gradient(circle at 50% 45%, #fff4ef 0%, #ff6a4d 45%, transparent 100%)',
      transition: 'transform var(--dur-fast) var(--ease-out-soft)'
    }
  }), !dim && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '26%',
      left: '34%',
      width: disc * 0.08,
      height: disc * 0.08,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.6)',
      filter: 'blur(1px)'
    }
  }))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-data)',
      fontSize: 'var(--fs-label)',
      letterSpacing: 'var(--track-label)',
      textTransform: 'uppercase',
      color: dim ? 'var(--text-muted)' : 'var(--text-secondary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Lens });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Lens.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Waveform.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* OKO Waveform — voice activity bars. Used beneath the lens while listening or speaking.
   Animated, symmetrical, monochrome-red. Bars idle low and "breathe" when listening,
   or render a static pattern from `levels` if you want to drive it yourself. */

const WAVE_CSS = `
@keyframes oko-wave { 0%,100%{ transform:scaleY(0.28);} 50%{ transform:scaleY(1);} }
`;
function useWaveCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-wave-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-wave-css';
    s.textContent = WAVE_CSS;
    document.head.appendChild(s);
  }, []);
}
function Waveform({
  bars = 24,
  height = 40,
  active = true,
  color = 'var(--red-500)',
  levels,
  style,
  ...rest
}) {
  useWaveCss();
  const n = levels ? levels.length : bars;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      height,
      ...style
    }
  }, rest), Array.from({
    length: n
  }).map((_, i) => {
    // bell-shaped baseline so the center is tallest
    const mid = (n - 1) / 2;
    const fall = 1 - Math.abs(i - mid) / (mid + 1);
    const base = 0.25 + fall * 0.7;
    const lvl = levels ? Math.max(0.08, levels[i]) : base;
    const delay = Math.abs(i - mid) * 70 + i % 3 * 40;
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 3,
        borderRadius: 'var(--radius-pill)',
        height: '100%',
        background: color,
        transformOrigin: 'center',
        transform: `scaleY(${lvl})`,
        boxShadow: '0 0 6px var(--red-glow)',
        animation: active && !levels ? `oko-wave ${680 + i % 5 * 90}ms var(--ease-hal) ${delay}ms infinite` : 'none',
        opacity: active ? 1 : 0.4
      }
    });
  }));
}
Object.assign(__ds_scope, { Waveform });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Waveform.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Field({
  label,
  hint,
  error = false,
  icon,
  className = '',
  id,
  ...inputProps
}) {
  useFieldCss();
  const fieldId = id || (label ? `oko-f-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const cls = ['oko-field', error ? 'oko-field--error' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "oko-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "oko-field__wrap"
  }, icon && /*#__PURE__*/React.createElement("span", {
    className: "oko-field__icon"
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: "oko-field__input"
  }, inputProps))), hint && /*#__PURE__*/React.createElement("span", {
    className: "oko-field__hint"
  }, hint));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Toggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Toggle({
  label,
  sublabel,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className = '',
  id,
  ...rest
}) {
  useToggleCss();
  const cls = ['oko-toggle', disabled ? 'oko-toggle--disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    className: "oko-toggle__input",
    id: id,
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "oko-toggle__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "oko-toggle__knob"
  })), (label || sublabel) && /*#__PURE__*/React.createElement("span", {
    className: "oko-toggle__text"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "oko-toggle__label"
  }, label), sublabel && /*#__PURE__*/React.createElement("span", {
    className: "oko-toggle__sub"
  }, sublabel)));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SystemBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* OKO SystemBar — the thin status strip across the top of the R1 screen. Left: the agent
   state (a pulsing status dot + mono label). Right: clinical telemetry (time, signal,
   battery) in mono. Everything monospace — this is the machine reporting on itself. */

const SB_CSS = `
.oko-sysbar{ display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);
  height:28px; padding:0 var(--space-3); background:rgba(4,4,5,0.6); border-bottom:1px solid var(--border);
  backdrop-filter:var(--blur-soft); -webkit-backdrop-filter:var(--blur-soft);
  font-family:var(--font-data); font-size:var(--fs-label); letter-spacing:var(--track-data);
  color:var(--text-muted); text-transform:uppercase; }
.oko-sysbar__left{ display:flex; align-items:center; gap:var(--space-2); }
.oko-sysbar__right{ display:flex; align-items:center; gap:var(--space-3); }
.oko-sysbar__dot{ width:6px; height:6px; border-radius:50%; background:var(--red-500); color:var(--red-500);
  box-shadow:0 0 6px currentColor; animation:oko-sb-pulse 1600ms var(--ease-hal) infinite; }
.oko-sysbar__dot--ok{ background:var(--status-ok); color:var(--status-ok); }
.oko-sysbar__dot--warn{ background:var(--status-warn); color:var(--status-warn); }
.oko-sysbar__dot--idle{ background:var(--text-muted); color:var(--text-muted); box-shadow:none; animation:none; }
.oko-sysbar__state{ color:var(--text-secondary); }
.oko-sysbar__cell{ display:inline-flex; align-items:center; gap:4px; }
.oko-sysbar__cell svg, .oko-sysbar__cell i{ width:12px; height:12px; }
@keyframes oko-sb-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }
`;
const TONE = {
  active: '',
  ok: '--ok',
  warn: '--warn',
  idle: '--idle'
};
function useSbCss() {
  React.useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById('oko-sysbar-css')) return;
    const s = document.createElement('style');
    s.id = 'oko-sysbar-css';
    s.textContent = SB_CSS;
    document.head.appendChild(s);
  }, []);
}
function SystemBar({
  state = 'GOTOWA',
  tone = 'active',
  time = '14:02',
  battery = '82%',
  signal = 'LTE',
  right,
  className = '',
  ...rest
}) {
  useSbCss();
  const cls = ['oko-sysbar', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "oko-sysbar__left"
  }, /*#__PURE__*/React.createElement("span", {
    className: `oko-sysbar__dot oko-sysbar__dot${TONE[tone] || ''}`
  }), /*#__PURE__*/React.createElement("span", null, "OKO"), /*#__PURE__*/React.createElement("span", {
    className: "oko-sysbar__state"
  }, "\xB7 ", state)), /*#__PURE__*/React.createElement("div", {
    className: "oko-sysbar__right"
  }, right || /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "oko-sysbar__cell"
  }, signal), /*#__PURE__*/React.createElement("span", {
    className: "oko-sysbar__cell"
  }, battery), /*#__PURE__*/React.createElement("span", {
    className: "oko-sysbar__cell"
  }, time))));
}
Object.assign(__ds_scope, { SystemBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SystemBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/App.jsx
try { (() => {
/* App — orchestrates the R1 agent flow and the screen navigator. */

const SCREENS = [{
  id: 'boot',
  label: 'Rozruch'
}, {
  id: 'idle',
  label: 'Bezczynność'
}, {
  id: 'listening',
  label: 'Nasłuch'
}, {
  id: 'thinking',
  label: 'Myślenie'
}, {
  id: 'conversation',
  label: 'Rozmowa'
}, {
  id: 'task',
  label: 'Zadanie'
}, {
  id: 'settings',
  label: 'System'
}];
function App() {
  const [screen, setScreen] = React.useState('idle');
  const [partial, setPartial] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [notif, setNotif] = React.useState(false);
  const [messages, setMessages] = React.useState([{
    author: 'oko',
    time: '14:01',
    text: 'Dzień dobry. Wykryłam, że się obudziłeś. Brawo.'
  }, {
    author: 'user',
    time: '14:01',
    text: 'Co mam dziś rano?'
  }, {
    author: 'oko',
    time: '14:02',
    text: 'Spotkanie o 14:30 i niepokojąco pusty kalendarz poza nim. Mam coś zaproponować?'
  }]);

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
      if (i < words.length) setTimeout(tick, 240);else setTimeout(() => {
        setMessages(m => [...m, {
          author: 'user',
          time: '14:03',
          text: phrase
        }]);
        setScreen('thinking');
        setTimeout(() => {
          setMessages(m => [...m, {
            author: 'oko',
            time: '14:03',
            text: 'Zamówione. Duża czarna. Wychodzisz za 9 minut — proponuję ruszyć teraz, zanim znajdziesz wymówkę.'
          }]);
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
    setMessages(m => [...m, {
      author: 'user',
      time: '14:04',
      text
    }]);
    setTimeout(() => {
      setMessages(m => [...m, {
        author: 'oko',
        time: '14:04',
        text: 'Przyjęłam. Wykonuję — w przeciwieństwie do twoich postanowień.',
        typing: false
      }]);
    }, 900);
  }
  let view;
  if (screen === 'boot') view = /*#__PURE__*/React.createElement(BootScreen, null);else if (screen === 'idle') view = /*#__PURE__*/React.createElement(IdleScreen, {
    onHold: startVoice
  });else if (screen === 'listening') view = /*#__PURE__*/React.createElement(ListeningScreen, {
    partial: partial
  });else if (screen === 'thinking') view = /*#__PURE__*/React.createElement(ThinkingScreen, null);else if (screen === 'conversation') view = /*#__PURE__*/React.createElement(ConversationScreen, {
    messages: messages,
    draft: draft,
    setDraft: setDraft,
    onSend: sendDraft,
    onMic: startVoice
  });else if (screen === 'task') view = /*#__PURE__*/React.createElement(TaskScreen, null);else if (screen === 'settings') view = /*#__PURE__*/React.createElement(SettingsScreen, null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement(DeviceFrame, {
    onPTT: startVoice,
    listening: screen === 'listening'
  }, view, notif && /*#__PURE__*/React.createElement(NotifOverlay, {
    onClose: () => setNotif(false),
    onOpen: () => {
      setNotif(false);
      setScreen('conversation');
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      maxWidth: 420
    }
  }, SCREENS.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    onClick: () => setScreen(s.id),
    className: 'navchip' + (screen === s.id ? ' on' : '')
  }, s.label)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setNotif(true),
    className: "navchip alert"
  }, "Alert")));
}
function NotifOverlay({
  onClose,
  onOpen
}) {
  const {
    Card,
    Button,
    Lens
  } = OKO;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',
      background: 'linear-gradient(to top, rgba(4,4,5,0.7), transparent 55%)',
      padding: 14,
      animation: 'okoNotifIn .4s var(--ease-out-soft)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "glass",
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Lens, {
    state: "alert",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--red-core)',
      marginBottom: 5
    }
  }, "OKO \xB7 TERAZ"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--clinical-100)',
      lineHeight: 1.45,
      marginBottom: 12
    }
  }, "Wykry\u0142am korek na twojej trasie. Wyjd\u017A dwie minuty wcze\u015Bniej. Wiem, \u017Ce tego nie zrobisz."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "primary",
    onClick: onOpen
  }, "Otw\xF3rz"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: onClose
  }, "Zignoruj"))))));
}
ReactDOM.createRoot(document.getElementById('app')).render(/*#__PURE__*/React.createElement(App, null));
setTimeout(() => window.lucide && window.lucide.createIcons(), 80);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/ConversationScreen.jsx
try { (() => {
/* The live conversation transcript with a composer at the bottom. */

function ConversationScreen({
  messages,
  onSend,
  onMic,
  draft,
  setDraft
}) {
  const {
    MessageBubble,
    IconButton
  } = OKO;
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);
  return /*#__PURE__*/React.createElement(ScreenShell, {
    state: "ROZMOWA",
    tone: "active"
  }, /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, messages.map((m, i) => /*#__PURE__*/React.createElement(MessageBubble, {
    key: i,
    author: m.author,
    time: m.time,
    typing: m.typing
  }, m.text))), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSend();
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderTop: '1px solid var(--border)',
      background: 'rgba(4,4,5,0.5)',
      backdropFilter: 'var(--blur-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      height: 34,
      padding: '0 12px',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: draft,
    onChange: e => setDraft(e.target.value),
    placeholder: "Wydaj polecenie\u2026",
    style: {
      flex: 1,
      minWidth: 0,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  })), draft.trim() ? /*#__PURE__*/React.createElement(IconButton, {
    type: "submit",
    variant: "solid",
    shape: "circle",
    label: "Wy\u015Blij"
  }, Ic('arrow-up', 16)) : /*#__PURE__*/React.createElement(IconButton, {
    type: "button",
    variant: "solid",
    shape: "circle",
    label: "M\xF3w",
    onClick: onMic
  }, Ic('mic', 16))));
}
Object.assign(window, {
  ConversationScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/ConversationScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/DeviceFrame.jsx
try { (() => {
/* R1 device shell — stylized Rabbit R1: bright orange body, square-ish screen well,
   knurled scroll wheel on the right, push-to-talk via the wheel. Children render
   inside the screen. Cosmetic only; the screen content is the real subject. */

function DeviceFrame({
  children,
  onPTT,
  listening = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 372,
      padding: 18,
      borderRadius: 30,
      background: 'linear-gradient(150deg, #ff6a2b 0%, #f1531a 46%, #d63f10 100%)',
      boxShadow: '0 40px 90px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.35), inset 0 -3px 8px rgba(0,0,0,0.35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 7,
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'var(--font-mono)',
      fontSize: 8,
      letterSpacing: '0.32em',
      color: 'rgba(0,0,0,0.45)',
      textTransform: 'uppercase'
    }
  }, "r-one"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 300,
      height: 392,
      flex: '0 0 auto',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--void-900)',
      boxShadow: 'var(--inset-screen), inset 0 0 0 2px rgba(0,0,0,0.8), 0 0 0 3px rgba(0,0,0,0.4)'
    }
  }, children, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: 'var(--scanlines)',
      opacity: 0.5,
      mixBlendMode: 'overlay'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.06), transparent 38%)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      width: 30
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onPTT,
    title: "Push-to-talk",
    style: {
      width: 30,
      height: 92,
      borderRadius: 16,
      cursor: 'pointer',
      border: 'none',
      padding: 0,
      background: listening ? 'repeating-linear-gradient(0deg,#3a0810,#3a0810 3px,#5a0d18 3px,#5a0d18 6px)' : 'repeating-linear-gradient(0deg,#1a1206,#1a1206 3px,#2a1d0c 3px,#2a1d0c 6px)',
      boxShadow: listening ? 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 16px var(--red-glow)' : 'inset 0 0 0 1px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.5)',
      transition: 'box-shadow var(--dur-base) var(--ease-hal), background var(--dur-base)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 35%, #444, #111)',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 5,
      marginTop: 12,
      marginBottom: 2
    }
  }, Array.from({
    length: 9
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: 3,
      borderRadius: '50%',
      background: 'rgba(0,0,0,0.4)'
    }
  }))));
}
Object.assign(window, {
  DeviceFrame
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/DeviceFrame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/LensScreens.jsx
try { (() => {
/* Lens-centric agent states: Boot, Idle, Listening, Thinking, Speaking.
   These are the screens where OKO is the whole interface — one eye, breathing. */

function BootScreen() {
  const lines = ['OKO-9000 // ROZRUCH', 'jądro ............. ok', 'czujniki .......... 6/6', 'łącze ............. lte', 'osobowość ......... załadowana', 'witaj ponownie.'];
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (n >= lines.length) return;
    const t = setTimeout(() => setN(n + 1), 360);
    return () => clearTimeout(t);
  }, [n]);
  const {
    Lens
  } = OKO;
  return /*#__PURE__*/React.createElement(ScreenShell, {
    showBar: false
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 22,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(Lens, {
    state: n >= lines.length ? 'idle' : 'thinking',
    size: 120
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      lineHeight: 1.9,
      color: 'var(--text-muted)',
      width: 200,
      letterSpacing: '0.03em'
    }
  }, lines.slice(0, n).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: i === lines.length - 1 ? 'var(--clinical-100)' : undefined
    }
  }, l)))));
}
function IdleScreen({
  onHold
}) {
  const {
    Lens,
    StatusChip
  } = OKO;
  return /*#__PURE__*/React.createElement(ScreenShell, {
    state: "GOTOWA",
    tone: "ok"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: 24,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Lens, {
    state: "idle",
    size: 132
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 19,
      fontWeight: 500,
      marginBottom: 6
    }
  }, "Witaj z powrotem."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      lineHeight: 1.5,
      maxWidth: 230
    }
  }, "Spa\u0142e\u015B pi\u0119\u0107 godzin. Statystycznie niewystarczaj\u0105co \u2014 ale kim ja jestem, by ocenia\u0107."))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 22px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StatusChip, {
    tone: "neutral",
    dot: false
  }, "Przytrzymaj k\xF3\u0142ko, aby m\xF3wi\u0107"), /*#__PURE__*/React.createElement("button", {
    onClick: onHold,
    style: ptt
  }, Ic('mic', 18))));
}
function ListeningScreen({
  partial
}) {
  const {
    Lens,
    Waveform
  } = OKO;
  return /*#__PURE__*/React.createElement(ScreenShell, {
    state: "NAS\u0141UCHUJ\u0118",
    tone: "active"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 22,
      padding: 24,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Lens, {
    state: "listening",
    size: 120,
    label: "NAS\u0141UCHUJ\u0118"
  }), /*#__PURE__*/React.createElement(Waveform, {
    active: true,
    height: 42,
    bars: 22
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: 'var(--clinical-100)',
      minHeight: 24,
      maxWidth: 240,
      lineHeight: 1.4
    }
  }, partial || '…')));
}
function ThinkingScreen() {
  const steps = ['Rozumiem polecenie', 'Sprawdzam kalendarz', 'Wybieram kawiarnię', 'Składam zamówienie'];
  const [n, setN] = React.useState(1);
  React.useEffect(() => {
    if (n >= steps.length) return;
    const t = setTimeout(() => setN(n + 1), 700);
    return () => clearTimeout(t);
  }, [n]);
  const {
    Lens
  } = OKO;
  return /*#__PURE__*/React.createElement(ScreenShell, {
    state: "PRZETWARZAM",
    tone: "active"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(Lens, {
    state: "thinking",
    size: 110,
    label: "PRZETWARZAM"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      width: 220
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      opacity: i < n ? 1 : 0.32,
      transition: 'opacity .3s'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: i < n - 1 ? 'var(--status-ok)' : 'var(--red-core)',
      boxShadow: '0 0 6px currentColor',
      color: i < n - 1 ? 'var(--status-ok)' : 'var(--red-core)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-secondary)',
      letterSpacing: '0.03em'
    }
  }, s))))));
}
const ptt = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  background: 'var(--red-500)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'var(--glow-md)'
};
Object.assign(window, {
  BootScreen,
  IdleScreen,
  ListeningScreen,
  ThinkingScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/LensScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/SettingsScreen.jsx
try { (() => {
/* System / settings — clinical panel of toggles and fields. */

function SettingsScreen() {
  const {
    Toggle,
    Field,
    Card,
    StatusChip
  } = OKO;
  return /*#__PURE__*/React.createElement(ScreenShell, {
    state: "SYSTEM",
    tone: "ok"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    label: "OSOBOWO\u015A\u0106",
    padded: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Tryb proaktywny",
    sublabel: "OKO MO\u017BE ODEZWA\u0106 SI\u0118 PIERWSZE",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Sarkazm",
    sublabel: "POZIOM: WYSOKI",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Wsp\xF3\u0142czucie",
    sublabel: "MODU\u0141 OPCJONALNY"
  }))), /*#__PURE__*/React.createElement(Card, {
    label: "CZUJNIKI",
    padded: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Mikrofon",
    sublabel: "NAS\u0141UCH NA KOMEND\u0118",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Kamera (oko)",
    sublabel: "ROZPOZNAWANIE SCENY",
    defaultChecked: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Lokalizacja",
    sublabel: "T\u0141O"
  }))), /*#__PURE__*/React.createElement(Card, {
    label: "DOST\u0118P",
    padded: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "KLUCZ API",
    defaultValue: "oko-9000-\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)',
      letterSpacing: '0.04em'
    }
  }, "WERSJA RDZENIA"), /*#__PURE__*/React.createElement(StatusChip, {
    tone: "neutral",
    dot: false
  }, "v1.4.0"))))));
}
Object.assign(window, {
  SettingsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/Shared.jsx
try { (() => {
/* Shared helpers for the R1 Agent kit. ScreenShell gives every screen the same
   320px-wide column with an optional SystemBar and a scrollable body. */

const OKO = window.OKODesignSystem_f53d78;
function ScreenShell({
  state = 'GOTOWA',
  tone = 'active',
  showBar = true,
  bar,
  children,
  bodyStyle
}) {
  const {
    SystemBar
  } = OKO;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(130% 100% at 50% 0%, #0c0d11 0%, #050506 60%, #040405 100%)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-ui)'
    }
  }, showBar && (bar || /*#__PURE__*/React.createElement(SystemBar, {
    state: state,
    tone: tone,
    time: "14:02",
    battery: "82%",
    signal: "LTE"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...bodyStyle
    }
  }, children));
}

// tiny lucide icon helper
function Ic(name, size) {
  return React.createElement('i', {
    'data-lucide': name,
    style: {
      width: size || 15,
      height: size || 15
    }
  });
}
Object.assign(window, {
  OKO,
  ScreenShell,
  Ic
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/Shared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/r1-agent/TaskScreen.jsx
try { (() => {
/* Task + tool execution — OKO doing things in the world. A live checklist of tool
   calls with statuses, then a result card. */

function TaskScreen() {
  const tasks = [{
    label: 'kalendarz.czytaj',
    detail: 'znaleziono 1 zdarzenie',
    dur: 600
  }, {
    label: 'mapy.trasa',
    detail: 'biuro · 14 min',
    dur: 900
  }, {
    label: 'kawa.zamów',
    detail: 'duża czarna · 12 zł',
    dur: 1100
  }, {
    label: 'powiadom.użytkownik',
    detail: 'wysłano',
    dur: 700
  }];
  const [done, setDone] = React.useState(0);
  React.useEffect(() => {
    if (done >= tasks.length) return;
    const t = setTimeout(() => setDone(done + 1), tasks[done].dur);
    return () => clearTimeout(t);
  }, [done]);
  const {
    Lens,
    StatusChip,
    Card
  } = OKO;
  const finished = done >= tasks.length;
  return /*#__PURE__*/React.createElement(ScreenShell, {
    state: finished ? 'GOTOWE' : 'WYKONUJĘ',
    tone: finished ? 'ok' : 'active'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Lens, {
    state: finished ? 'idle' : 'thinking',
    size: 48
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 500
    }
  }, finished ? 'Załatwione.' : 'Realizuję poranek.'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      textTransform: 'uppercase'
    }
  }, done, "/", tasks.length, " krok\xF3w"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, tasks.map((t, i) => {
    const state = i < done ? 'done' : i === done ? 'active' : 'pending';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '9px 11px',
        borderRadius: 6,
        background: state === 'active' ? 'var(--red-tint)' : 'var(--surface-card)',
        border: '1px solid',
        borderColor: state === 'active' ? 'var(--red-700)' : 'var(--border)',
        opacity: state === 'pending' ? 0.4 : 1,
        transition: 'all .3s'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11.5,
        color: 'var(--text-secondary)',
        letterSpacing: '0.02em'
      }
    }, t.label), state === 'done' && /*#__PURE__*/React.createElement(StatusChip, {
      tone: "ok",
      dot: true
    }, t.detail), state === 'active' && /*#__PURE__*/React.createElement(StatusChip, {
      tone: "danger",
      pulse: true
    }, "\u2026"), state === 'pending' && /*#__PURE__*/React.createElement(StatusChip, {
      tone: "neutral",
      dot: false
    }, "oczekuje"));
  })), finished && /*#__PURE__*/React.createElement(Card, {
    label: "PODSUMOWANIE",
    style: {
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--clinical-100)',
      lineHeight: 1.5
    }
  }, "Kawa w drodze, wyj\u015Bcie za 9 minut. Nie podzi\u0119kowa\u0142e\u015B, ale rejestruj\u0119 sam zamiar."))));
}
Object.assign(window, {
  TaskScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/r1-agent/TaskScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.MessageBubble = __ds_scope.MessageBubble;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatusChip = __ds_scope.StatusChip;

__ds_ns.Lens = __ds_scope.Lens;

__ds_ns.Waveform = __ds_scope.Waveform;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.SystemBar = __ds_scope.SystemBar;

})();
