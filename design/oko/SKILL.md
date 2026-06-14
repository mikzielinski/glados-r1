---
name: oko-design
description: Use this skill to generate well-branded interfaces and assets for OKO — a conversational AI agent for the Rabbit R1 device, in the spirit of HAL 9000 and GLaDOS (dark "void" UI, a single glowing red lens, clinical mono telemetry, dry/ominous Polish voice). For production or throwaway prototypes/mocks. Contains design guidelines, colors, type, fonts, assets, and a full R1 UI kit of components.
user-invocable: true
---

Read `readme.md` first — it is the full design guide (content fundamentals / voice, visual
foundations, iconography, and a file index). Then explore the other files as needed.

**Where things are**
- `styles.css` — link this one file to inherit all tokens + fonts.
- `tokens/` — CSS custom properties (colors, type, spacing, effects, motion, fonts).
- `assets/` — the OKO lens mark + wordmark (SVG).
- `components/` — React primitives (Lens, Waveform, Button, IconButton, Card, StatusChip,
  Field, Toggle, MessageBubble, SystemBar). Each has a `.prompt.md` with usage.
- `guidelines/` — foundation specimen cards (open the `.html` to see live tokens).
- `ui_kits/r1-agent/` — a full interactive recreation of OKO on the Rabbit R1.

**How to work**
- If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and
  produce static HTML files for the user to view. Link `styles.css`, load the component bundle
  (`_ds_bundle.js`) if you need the React primitives, and use Lucide for icons.
- If working on production code, copy assets and absorb the rules here to design as an expert
  in this brand.
- **Hold the voice.** Calm, precise, quietly menacing; first-person feminine; informal *ty*;
  Polish primary; periods not exclamation marks; **no emoji**. UPPERCASE mono for machine
  labels, sentence-case grotesque for the agent's spoken lines.
- **Ration the red.** Near-black void + clinical off-white everywhere; the single red lens is
  the only light source and the only chromatic accent. One lens on screen at a time. Nothing
  bounces; the lens breathes.

If invoked with no other guidance, ask what the user wants to build, ask a few sharp questions,
then act as an expert designer who outputs HTML artifacts **or** production code as the need
dictates.
