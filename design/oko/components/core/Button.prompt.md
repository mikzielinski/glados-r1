Machined control button; `primary` is the one filled-red glowing action per screen, `secondary` is a hairline outline, `ghost` is bare. Labels render uppercase.

```jsx
<Button variant="primary" size="md">Potwierdź</Button>
<Button variant="secondary" icon={<i data-lucide="x" />}>Anuluj</Button>
<Button variant="ghost" size="sm">Pomiń</Button>
<Button variant="primary" loading block>Wykonuję…</Button>
```

Props: `variant` (primary/secondary/ghost), `size` (sm/md/lg), `block`, `loading`, `icon`, `iconRight`, plus all native button attrs.
