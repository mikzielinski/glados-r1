import * as React from 'react';

/**
 * Voice-activity waveform — a row of symmetrical red bars shown beneath the lens
 * while the agent is listening or speaking. Animates on its own, or pass `levels`
 * to drive each bar from real audio data.
 */
export interface WaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of bars when not driven by `levels`. Default 24. */
  bars?: number;
  /** Pixel height of the waveform. Default 40. */
  height?: number;
  /** Animate (true) or sit static/dimmed (false). Default true. */
  active?: boolean;
  /** Bar color. Default var(--red-500). */
  color?: string;
  /** Explicit per-bar amplitudes 0..1; disables the built-in animation. */
  levels?: number[];
}

export function Waveform(props: WaveformProps): JSX.Element;
