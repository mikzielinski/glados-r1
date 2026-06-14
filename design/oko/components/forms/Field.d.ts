import * as React from 'react';

/**
 * A clinical text input: recessed dark well, uppercase mono label above, monospace
 * value, red focus seam. Spreads native input attributes onto the underlying input.
 */
export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase mono label above the field. */
  label?: React.ReactNode;
  /** Helper text below the field (turns red when `error`). */
  hint?: React.ReactNode;
  /** Error state styling. */
  error?: boolean;
  /** Leading icon node. */
  icon?: React.ReactNode;
}

export function Field(props: FieldProps): JSX.Element;
