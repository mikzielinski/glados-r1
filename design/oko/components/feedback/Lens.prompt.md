The OKO lens — the agent's single all-seeing eye and the only light source in the system; use it as the focal point of any agent surface.

```jsx
<Lens state="listening" size={200} label="NASŁUCHUJĘ" />
<Lens state="speaking" amplitude={0.8} />
<Lens state="thinking" label="PRZETWARZAM" />
```

States: `idle` (slow breathing), `listening` (pulse ring), `thinking` (rotating arc + flicker), `speaking` (core scales with `amplitude` 0–1), `alert` (sharp brightening), `offline` (dim, no glow). Only ever show ONE lens on screen at a time.
