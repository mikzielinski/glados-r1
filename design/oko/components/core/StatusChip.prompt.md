A clinical status readout: a glowing dot plus uppercase mono label, in the rationed status palette.

```jsx
<StatusChip tone="ok" pulse>ONLINE</StatusChip>
<StatusChip tone="warn" solid>UWAGA</StatusChip>
<StatusChip tone="danger" solid pulse>BŁĄD</StatusChip>
<StatusChip tone="neutral" dot={false}>v1.4.0</StatusChip>
```

Props: `tone` (ok/warn/danger/info/neutral), `solid` (tinted fill), `pulse` (live dot), `dot`.
