A single-icon control; square by default, `shape="circle"` for push-to-talk / lens-adjacent actions. Pass the icon as the child and always set `label`.

```jsx
<IconButton label="Ustawienia"><i data-lucide="settings" /></IconButton>
<IconButton variant="solid" shape="circle" size="lg" label="Mów"><i data-lucide="mic" /></IconButton>
<IconButton variant="outline" label="Zamknij"><i data-lucide="x" /></IconButton>
```

Props: `variant` (ghost/outline/solid), `size` (sm/md/lg), `shape` (square/circle), `label`.
