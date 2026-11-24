import { useCallback, useState } from 'react';
import type { CoachContext, CoachMode, CoachResultByMode, Language } from '../core/coach';
import { askCoach } from '../services/api';

export type CoachSource = 'gemini' | 'offline';

export interface CoachOutcome<T> {
  status: 'idle' | 'loading' | 'done';
  source?: CoachSource;
  result?: T;
}

export type RunCoach = (
  context: CoachContext,
  language: Language,
  question?: string,
) => Promise<void>;

/**
 * Asks the AI coach for one mode. Any failure — network, rate limit, model overload — falls
 * back to the deterministic answer from `fallback`, so the person always gets a result.
 */
export function useCoach<M extends CoachMode>(
  mode: M,
  fallback: (context: CoachContext, language: Language) => CoachResultByMode[M],
): [CoachOutcome<CoachResultByMode[M]>, RunCoach] {
  const [outcome, setOutcome] = useState<CoachOutcome<CoachResultByMode[M]>>({ status: 'idle' });

  const run = useCallback<RunCoach>(
    async (context, language, question) => {
      setOutcome((current) => ({ ...current, status: 'loading' }));
      try {
        const result = await askCoach({
          mode,
          language,
          context,
          ...(question ? { question } : {}),
        });
        setOutcome({ status: 'done', source: 'gemini', result });
      } catch {
        setOutcome({ status: 'done', source: 'offline', result: fallback(context, language) });
      }
    },
    [mode, fallback],
  );

  return [outcome, run];
}
