Voice-activity waveform — a row of red bars shown beneath the lens while OKO is listening or speaking.

```jsx
<Waveform active height={48} />
<Waveform levels={[0.2, 0.6, 1, 0.5, 0.3]} />
```

Self-animates with a bell-shaped baseline (center bars tallest). Pass `levels` (array of 0–1) to drive it from real audio instead. Set `active={false}` to dim it when idle.
