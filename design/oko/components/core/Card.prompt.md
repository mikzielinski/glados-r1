A machined panel — hairline seam, faint top highlight, tight radius. Use `inset` for recessed wells and `glass` for blurred floating overlays.

```jsx
<Card label="TELEMETRIA" actions={<StatusChip tone="ok">ONLINE</StatusChip>}>
  Wszystkie systemy nominalne.
</Card>
<Card variant="inset">…transkrypcja…</Card>
<Card variant="glass">…overlay…</Card>
```

Props: `variant` (default/inset/glass), `label`, `actions`, `padded`. Never add a colored left-border accent — that's off-brand.
