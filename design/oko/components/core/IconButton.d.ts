import * as React from 'react';

export type IconButtonVariant = 'ghost' | 'outline' | 'solid';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * A single-icon control. Square by default; `shape="circle"` for push-to-talk and
 * lens-adjacent actions. Always pass `label` for accessibility — the icon is the child.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Default 'ghost'. */
  variant?: IconButtonVariant;
  /** Size. Default 'md'. */
  size?: IconButtonSize;
  /** 'square' (tight radius) or 'circle'. Default 'square'. */
  shape?: 'square' | 'circle';
  /** Accessible label (also used as tooltip). */
  label?: string;
}

export function IconButton(props: IconButtonProps): JSX.Element;
