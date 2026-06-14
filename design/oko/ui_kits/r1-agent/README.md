# R1 Agent — UI kit

A high-fidelity recreation of **OKO**, the conversational agent, running on a stylized
**Rabbit R1** handheld (Android 14). The kit composes the OKO component primitives — it
does not re-implement them.

## Files
- `index.html` — interactive demo. Loads the DS bundle, mounts the device + screen navigator.
- `DeviceFrame.jsx` — the orange R1 body, screen well, knurled scroll wheel (= push-to-talk), speaker grille. Cosmetic shell only.
- `Shared.jsx` — `ScreenShell` (SystemBar + body column) and the `Ic` Lucide helper. Defines the `OKO` namespace alias.
- `LensScreens.jsx` — `BootScreen`, `IdleScreen`, `ListeningScreen`, `ThinkingScreen` — the lens-as-whole-interface states.
- `ConversationScreen.jsx` — transcript (`MessageBubble`) + composer.
- `TaskScreen.jsx` — live tool-call checklist + result card.
- `SettingsScreen.jsx` — clinical panels of `Toggle` / `Field`.
- `App.jsx` — flow orchestration + the proactive `NotifOverlay`.

## Interactions
- **Push-to-talk**: click the scroll wheel (or the mic button) → listening → thinking → the reply lands in the transcript.
- **Navigator chips** (below the device): jump to any screen state; **Alert** triggers the proactive notification overlay.
- **Composer**: type a command in the conversation screen and send.

## Screen canvas
Screens render into a **300×392** well. Keep new screens to that size, lead with `ScreenShell`,
and reach for the DS primitives rather than bespoke markup.
