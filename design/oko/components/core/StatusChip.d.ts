import * as React from 'react';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

/**
 * A clinical status readout: a glowing dot + uppercase mono label. Tones map to the
 * rationed status palette. `pulse` makes the dot breathe for a live signal.
 */
export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status color. Default 'neutral'. */
  tone?: StatusTone;
  /** Tinted fill instead of hairline outline. */
  solid?: boolean;
  /** Animate the dot (live/active signal). */
  pulse?: boolean;
  /** Render the leading dot. Default true. */
  dot?: boolean;
}

export function StatusChip(props: StatusChipProps): JSX.Element;
