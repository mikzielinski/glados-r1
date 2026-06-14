import * as React from 'react';

export type SystemBarTone = 'active' | 'ok' | 'warn' | 'idle';

/**
 * The thin status strip across the top of the R1 screen. Left shows the agent state
 * (pulsing dot + "OKO · <state>"); right shows clinical telemetry. All monospace.
 */
export interface SystemBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Agent state label, e.g. "GOTOWA", "NASŁUCHUJĘ", "OFFLINE". */
  state?: string;
  /** Color of the state dot. Default 'active' (red, pulsing). */
  tone?: SystemBarTone;
  /** Clock readout. */
  time?: string;
  /** Battery readout. */
  battery?: string;
  /** Signal readout. */
  signal?: string;
  /** Replace the entire right-hand telemetry cluster. */
  right?: React.ReactNode;
}

export function SystemBar(props: SystemBarProps): JSX.Element;
