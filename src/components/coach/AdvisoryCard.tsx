import { useState, type ReactElement } from 'react';
import {
  fallbackAdvisory,
  type CoachAdvisory,
  type CoachContext,
  type Language,
} from '../../core/coach';
import { useCoach } from '../../hooks/useCoach';
import { SourceBadge } from './SourceBadge';

interface AdvisoryCardProps {
  context: CoachContext;
  language: Language;
}

/** Shares through the native share sheet when available, otherwise copies to the clipboard. */
export async function shareAdvisory(item: CoachAdvisory): Promise<string> {
  const text = `${item.title}\n\n${item.message}`;
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: item.title, text });
      return 'Shared.';
    }
    await navigator.clipboard.writeText(text);
    return 'Copied — paste it into your group chat.';
  } catch {
    return 'Could not share automatically; select the text and copy it.';
  }
}

/** A ready-to-send notice for a residents' association, school or office group. */
export function AdvisoryCard({ context, language }: AdvisoryCardProps): ReactElement {
  const [advisory, run] = useCoach('community', fallbackAdvisory);
  const [shareStatus, setShareStatus] = useState('');
  const loading = advisory.status === 'loading';
  const result = advisory.result;

  return (
    <section className="card span-2" aria-labelledby="advisory-heading" aria-busy={loading}>
      <h2 id="advisory-heading">Community advisory</h2>
      <p className="hint">
        A short message for your RWA, school or office group with today&apos;s clean window and
        collective actions.
      </p>
      <button
        type="button"
        className="button"
        disabled={loading}
        onClick={() => void run(context, language)}
      >
        {loading ? 'Drafting…' : 'Draft advisory'}
      </button>
      <div aria-live="polite">
        {result ? (
          <div className="advisory">
            <SourceBadge source={advisory.source} />
            <h3 lang={language}>{result.title}</h3>
            <p className="advisory-text" lang={language}>
              {result.message}
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() => void shareAdvisory(result).then(setShareStatus)}
            >
              Share or copy
            </button>
            <p role="status" className="hint">
              {shareStatus}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
