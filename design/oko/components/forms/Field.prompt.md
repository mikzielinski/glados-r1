A clinical text input — recessed well, uppercase mono label, monospace value, red focus seam.

```jsx
<Field label="IDENTYFIKATOR" placeholder="np. OKO-9000" />
<Field label="ZAPYTANIE" icon={<i data-lucide="search" />} hint="Wpisz polecenie dla agenta" />
<Field label="KLUCZ API" error hint="Nieprawidłowy klucz." defaultValue="••••" />
```

Spreads native input attributes. Props: `label`, `hint`, `error`, `icon`.
