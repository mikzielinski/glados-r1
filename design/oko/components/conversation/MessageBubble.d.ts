import * as React from 'react';

/**
 * One line in the agent transcript. `author="oko"` renders the machine voice — a red
 * lens marker, uppercase mono byline, full-width clinical body (no bubble). `author="user"`
 * renders a contained, right-aligned panel bubble. The asymmetry is intentional.
 */
export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Who is speaking. Default 'oko'. */
  author?: 'oko' | 'user';
  /** Byline override (defaults: "OKO" / "TY"). */
  name?: string;
  /** Timestamp shown in the byline. */
  time?: string;
  /** Show a blinking terminal cursor (agent mid-utterance). */
  typing?: boolean;
}

export function MessageBubble(props: MessageBubbleProps): JSX.Element;
