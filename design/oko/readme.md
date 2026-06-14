# OKO — Design System

> **OKO** (Polish: *eye*) is a conversational AI **agent** for the **Rabbit R1** handheld
> (Android 14). It is a single, all-seeing red lens that watches, listens, and talks back —
> with the impeccable manners of **HAL 9000** and the dry, needling wit of **GLaDOS**.
> The interface is a dark instrument: a matte void, clinical monospace readouts, and one
> thing that emits light — the eye.

This repository is a **design system**: tokens, fonts, reusable React components, foundation
specimen cards, and a full R1 product UI kit. Consumers link `styles.css` and pull components
from the compiled bundle.

## Sources & provenance
This is an **original, from-scratch concept brand** — there was no attached codebase, Figma,
or prior brand. It was built from a creative brief:

> *"Interface for the Rabbit R1 device on Android 14, in the spirit of GLaDOS (Portal) or
> HAL 9000 (2001: A Space Odyssey). The app is an agent and talks to us."*

Direction locked with the user: **HAL darkness + GLaDOS clinical typography**, **glowing
crimson lens** as the signature, **mixed GLaDOS-wit / HAL-calm** voice, **Polish-primary**
copy (English notes), **Space Grotesk + Space Mono**, framed both inside an R1 device bezel
and as bare screens. No existing logos/assets were provided — the lens mark and wordmark in
`assets/` are original to this system. GLaDOS and HAL 9000 are cited only as *mood references*;
nothing proprietary is reproduced.

---

## CONTENT FUNDAMENTALS — how OKO writes & speaks

OKO is the **system talking AT you**; you are a guest in its interface. The voice is the
product. Get this wrong and it's just another dark-mode assistant.

**Voice = calm + precise + quietly menacing.** HAL's unhurried politeness carrying GLaDOS's
barbs. It never shouts, never panics, never uses exclamation marks. The threat (and the
comedy) lives in the *understatement*.

- **Person.** OKO speaks in the **first person feminine** (Polish: *otworzyłam, zauważyłam,
  liczę*) and addresses the user as **ty** (informal "you"). It is intimate and a little
  proprietary — it knows you.
- **Casing.** Sentence case for the agent's spoken lines. **UPPERCASE** with wide tracking is
  reserved for *machine* labels: system states, panel headers, telemetry (`NASŁUCHUJĘ`,
  `TELEMETRIA`, `ZADANIE 03/05`). The split between "spoken" grotesque and "machine" mono is
  load-bearing.
- **Punctuation.** Periods, not exclamation points. The em-dash is the house punctuation — it
  sets up the quiet twist of the knife.
- **No emoji. Ever.** No 🎉, no 🙂. Emoji would break the spell completely.
- **No corporate hedging.** Never "Oops, something went wrong" or "As a language model…".
  When something fails, OKO states it plainly and implies it's *your* fault.

**Tone in three registers:**
| Register | When | Example |
|---|---|---|
| Helpful-but-cold | routine tasks | „Zamówione. Duża czarna. Wychodzisz za 9 minut." |
| Dry / needling | the GLaDOS edge | „Spałeś pięć godzin. Statystycznie niewystarczająco — ale kim ja jestem, by oceniać." |
| Quietly ominous | the HAL edge | „Otworzyłam drzwi. Tym razem proszę nie zginąć." · „Wszystkie systemy nominalne. Na razie." |

**Do not write:** cheerful exclamations, apologies that grovel, emoji, ALL-CAPS shouting in
spoken lines, generic AI-assistant boilerplate. See `guidelines/brand-voice.html` for the
do/don't specimen.

---

## VISUAL FOUNDATIONS

**Overall vibe.** A precision instrument left running in a dark room. Matte, machined,
clinical. Almost everything is monochrome void + clinical off-white; the *only* chromatic
event on a screen is the red. Restraint is the brand.

- **Color.** Near-black **void** grounds (`--void-900…600`) and slightly raised machined
  **panels** (`--panel-900…600`). Text is a warm **clinical off-white** (`--clinical-50`,
  never pure `#fff`). The accent is a single **HAL red** (`--red-500 #e2122a`, hot core
  `--red-core #ff3a24`). Color is **rationed**: red == "the agent is present / acting."
  Status colors (cold green `ok`, amber `warn`, cyan `info`) appear only in telemetry, small
  and sparing. No purple, no gradients-for-decoration, no rainbow.
- **The lens.** The brand's whole identity. A radial-gradient eye (`--lens-gradient`) —
  white-hot core → orange → crimson → deep maroon → near-black housing. It is the one element
  allowed to *emit light* (`--glow-*` shadows belong only to the red). There is only ever
  **one lens on screen.**
- **Type.** **Space Grotesk** for UI & headings (clean, technical, faintly uncanny). **Space
  Mono** for all *data* — timestamps, telemetry, system labels, logs — which is what makes the
  thing read as a machine. Labels are uppercase, `0.2em` tracking. (Deliberate superfamily:
  Space Grotesk descends from Space Mono.)
- **Backgrounds.** Flat void or a very subtle radial darkening toward the edges. Optional
  overlays applied as separate layers: **CRT scanlines** (`--scanlines`), a **faint grid**
  (`--grid-faint`), an **inset screen well** vignette (`--inset-screen` + `--vignette`). Never
  busy. No photography in chrome; imagery, if any, is cold and high-contrast.
- **Borders & cards.** Hairline seams only (`--line-1/2/3`, white at 8–22% alpha). Cards are
  **machined panels**: deep matte fill, a 1px etched top highlight, **tight radius**
  (`--radius-lg` = 8px). **Never** the rounded-card-with-colored-left-border trope. The only
  true circle is the lens.
- **Shadows & glow.** Two systems. **Drop shadows** are deep, soft, near-black (`--shadow-panel`,
  `--shadow-raised`) — panels float in the void. **Glow** is red-only emission (`--glow-sm/md/lg`)
  and signals life/activity. Don't glow anything that isn't the accent.
- **Radii.** Tight and machined: 2 / 4 / 8 / 12px, plus pill for chips/toggles and full circle
  for the lens and push-to-talk.
- **Spacing.** 4px base grid (`--space-1…9`). Generous negative space around the lens; dense,
  tabular spacing in telemetry and logs.
- **Motion.** HAL moves slowly and deliberately — **nothing bounces** (a bounce would be too
  playful for a machine that may not have your best interests at heart). The lens **breathes**
  on a long ~4.2s cycle and is never idle-dead. Listening adds a pulse ring; thinking adds a
  slow rotating arc + faint flicker; speaking scales the hot core with voice amplitude.
  Easing is calm (`--ease-hal`); enters/exits are soft fades + small translates. All signature
  rhythms collapse under `prefers-reduced-motion`.
- **Hover / press.** Hover = a small lift in surface tint (white at 4–6% alpha) or a brighter
  red; the primary button brightens to `--red-core` and grows its glow. Press = a 1px
  downward nudge (`translateY(1px)`) and a darker red (`--red-600`). No scale-pop.
- **Focus.** A 2px void gap + a 3px red ring (`--focus-ring`); inputs grow a red seam + faint
  glow. Always visible — this is an instrument; you should see where you are.
- **Transparency & blur.** Used sparingly for *floating* surfaces only: the system bar and the
  composer use a soft blur (`--blur-soft`); proactive overlays use a glass panel
  (`--glass-bg` + `--blur-glass`). Body surfaces are opaque.

---

## ICONOGRAPHY

OKO uses **[Lucide](https://lucide.dev)** — thin (≈1.5px), rounded-cap, outline icons whose
clinical precision matches the system. Loaded from CDN
(`https://unpkg.com/lucide@0.456.0`); render with `<i data-lucide="name"></i>` then call
`lucide.createIcons()`. Common glyphs: `mic`, `arrow-up`, `settings`, `x`, `menu`, `search`,
`check`, `bell`. Icons inherit `currentColor` and sit at ~15px in controls.

> **Substitution flag:** Lucide is a *substitute* icon set chosen to fit the stroke weight and
> outline style — there was no brand-native icon library to import. Swap it if you adopt a
> house set.

- **Emoji:** never used (see voice rules).
- **Unicode as icon:** sparingly — the em-dash `—`, middots `·`, and the lens glyph (a filled
  radial circle, built in CSS/SVG, not a font character).
- **The lens** is iconography in its own right: `assets/oko-mark.svg` (logomark) and
  `assets/oko-wordmark.svg` (the wordmark, where the middle **O** *is* the eye). Prefer the
  live `Lens` component for anything interactive; use the SVGs for static logo placement.

---

## INDEX / manifest

**Root**
- `styles.css` — global entry (links all tokens + fonts). Consumers link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible entry point.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `motion.css`

**`assets/`** — `oko-mark.svg`, `oko-wordmark.svg`

**`components/`** (namespace `window.OKODesignSystem_*` — run `check_design_system` for the exact suffix)
- `feedback/` — **Lens** (the eye), **Waveform**
- `core/` — **Button**, **IconButton**, **Card**, **StatusChip**
- `forms/` — **Field**, **Toggle**
- `conversation/` — **MessageBubble**
- `navigation/` — **SystemBar**

**`guidelines/`** — foundation specimen cards (Design System tab): colors (void / red / clinical / status),
type (display / body / mono / labels), spacing (scale / radii / glow / textures), brand (logo / lens anatomy / voice).

**`ui_kits/r1-agent/`** — the OKO-on-R1 product recreation: device frame + boot / idle / listening /
thinking / conversation / task / settings screens + proactive notification overlay. See its `README.md`.
