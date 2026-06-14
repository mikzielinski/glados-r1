A hardware-style switch; the recessed track lights red when ON. Optional label + mono sublabel.

```jsx
<Toggle label="Tryb proaktywny" sublabel="OKO MOŻE ODEZWAĆ SIĘ PIERWSZE" defaultChecked />
<Toggle label="Mikrofon" checked={mic} onChange={e => setMic(e.target.checked)} />
```

Props: `label`, `sublabel`, `checked`/`defaultChecked`, `disabled`, plus native checkbox attrs.
