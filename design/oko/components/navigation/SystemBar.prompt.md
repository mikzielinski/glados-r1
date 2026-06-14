The thin R1 status strip: left shows agent state (pulsing dot + "OKO · <state>"), right shows mono telemetry.

```jsx
<SystemBar state="NASŁUCHUJĘ" tone="active" time="14:02" battery="82%" signal="LTE" />
<SystemBar state="OFFLINE" tone="idle" />
```

Props: `state`, `tone` (active/ok/warn/idle), `time`, `battery`, `signal`, or `right` to replace the telemetry cluster.
