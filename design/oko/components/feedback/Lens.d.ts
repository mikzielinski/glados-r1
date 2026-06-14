import * as React from 'react';

export type LensState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'alert' | 'offline';

/**
 * The OKO lens — the agent's single eye and the system's only light source.
 * Use it as the focal point of any agent surface: idle/boot screens, the listening
 * state, processing indicators, and "speaking" feedback. There should only ever be
 * ONE lens visible on screen at a time.
 *
 * @startingPoint section="Agent" subtitle="The all-seeing OKO lens, every state" viewport="320x320"
 */
export interface LensProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Behavioural state. Drives glow, motion and the thinking arc. Default 'idle'. */
  state?: LensState;
  /** Pixel diameter of the housing. Default 160. */
  size?: number;
  /** 0..1 — when state="speaking", scales the hot core to fake voice amplitude. */
  amplitude?: number;
  /** Optional clinical mono label rendered below the lens (e.g. "NASŁUCHUJĘ"). */
  label?: string;
}

export function Lens(props: LensProps): JSX.Element;
