import * as React from 'react';

export type CardVariant = 'default' | 'inset' | 'glass';

/**
 * A machined panel: hairline seam, faint top highlight, deep matte fill, tight radius.
 * Use `inset` for recessed wells (readouts, transcripts) and `glass` for floating
 * blurred overlays. Optional clinical header `label` + right-aligned `actions`.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface treatment. Default 'default'. */
  variant?: CardVariant;
  /** Uppercase mono header label (e.g. "TELEMETRIA"). */
  label?: React.ReactNode;
  /** Right-aligned node in the header (icons, status). */
  actions?: React.ReactNode;
  /** Apply default body padding. Set false for flush media/lists. Default true. */
  padded?: boolean;
}

export function Card(props: CardProps): JSX.Element;
