import * as React from 'react';

/**
 * A hardware-style switch. The recessed track lights red when ON (a circuit closing).
 * Optional label + mono sublabel to its right. Controlled (`checked`) or uncontrolled
 * (`defaultChecked`).
 */
export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Primary label text. */
  label?: React.ReactNode;
  /** Mono sub-label below the label. */
  sublabel?: React.ReactNode;
  /** Controlled on/off. */
  checked?: boolean;
  /** Disable interaction. */
  disabled?: boolean;
}

export function Toggle(props: ToggleProps): JSX.Element;
