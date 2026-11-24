import type { ReactElement } from 'react';
import type { CoachSource } from '../../hooks/useCoach';

const TEXT: Record<CoachSource, string> = {
  gemini: 'Written by Gemini from your numbers',
  offline:
    'Offline explanation — Gemini is busy right now, so this reply comes from Saans’ own engine. Try again in a minute.',
};

/** Says where a reply came from, so people know whether the AI or the built-in engine wrote it. */
export function SourceBadge({ source }: { source: CoachSource | undefined }): ReactElement | null {
  return source ? <p className={`badge badge-${source}`}>{TEXT[source]}</p> : null;
}
