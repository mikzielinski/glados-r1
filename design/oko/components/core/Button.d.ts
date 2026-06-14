import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Machined control button. `primary` is the only filled-red action on a screen and
 * carries the lens glow — use one per view. `secondary` is a hairline outline,
 * `ghost` is bare. Labels render UPPERCASE.
 *
 * @startingPoint section="Core" subtitle="Primary / secondary / ghost buttons" viewport="700x180"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Default 'primary'. */
  variant?: ButtonVariant;
  /** Control height. Default 'md'. */
  size?: ButtonSize;
  /** Stretch to full width. */
  block?: boolean;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Leading icon node (e.g. a Lucide <i data-lucide>). */
  icon?: React.ReactNode;
  /** Trailing icon node. */
  iconRight?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
