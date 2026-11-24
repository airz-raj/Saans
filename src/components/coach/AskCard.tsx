import { useId, useState, type ReactElement, type SyntheticEvent } from 'react';
import { fallbackAnswer, type CoachContext, type Language } from '../../core/coach';
import { useCoach } from '../../hooks/useCoach';
import { SourceBadge } from './SourceBadge';

const SUGGESTED = [
  'Is it safe to take my child to the park this evening?',
  'Which room should we sleep in and how do we keep it clean?',
  'What should an asthma patient at home do today?',
] as const;

/** Minimum question length accepted by the server. */
const MIN_QUESTION = 3;

interface AskCardProps {
  context: CoachContext;
  language: Language;
}

interface SuggestionsProps {
  items: readonly string[];
  onPick: (text: string) => void;
  label?: string;
}

function Suggestions({ items, onPick, label }: Readonly<SuggestionsProps>): ReactElement {
  return (
    <div className="suggestions" aria-label={label}>
      {items.map((text) => (
        <button key={text} type="button" className="chip chip-button" onClick={() => onPick(text)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** Free-form questions, answered with the live forecast and the family's numbers attached. */
export function AskCard({ context, language }: Readonly<AskCardProps>): ReactElement {
  const questionId = useId();
  const [question, setQuestion] = useState('');
  const [answer, run] = useCoach('ask', fallbackAnswer);
  const loading = answer.status === 'loading';
  const trimmed = question.trim();

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (trimmed.length >= MIN_QUESTION) void run(context, language, trimmed);
  };

  return (
    <section className="card" aria-labelledby="ask-heading" aria-busy={loading}>
      <h2 id="ask-heading">Ask a question</h2>
      <form onSubmit={submit} className="ask-form">
        <label htmlFor={questionId}>Your question</label>
        <textarea
          id={questionId}
          rows={3}
          maxLength={500}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Can grandpa go for his evening walk?"
        />
        <Suggestions items={SUGGESTED} onPick={setQuestion} />
        <button
          type="submit"
          className="button"
          disabled={loading || trimmed.length < MIN_QUESTION}
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      <div aria-live="polite">
        {answer.result ? (
          <div className="answer" lang={language}>
            <SourceBadge source={answer.source} />
            <p>{answer.result.answer}</p>
            {answer.result.followUps.length > 0 ? (
              <Suggestions
                items={answer.result.followUps}
                onPick={setQuestion}
                label="Follow-up questions"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
