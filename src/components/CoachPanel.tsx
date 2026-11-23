import { useId, useState, type FormEvent } from 'react';
import {
  fallbackAdvisory,
  fallbackAnswer,
  fallbackPlan,
  type CoachAdvisory,
  type CoachAnswer,
  type CoachContext,
  type CoachMode,
  type CoachPlan,
  type Language,
} from '../core/coach';
import { askCoach, type CoachResult } from '../services/api';
import { SelectField } from './fields';

type Source = 'gemini' | 'offline';
interface Outcome<T> {
  status: 'idle' | 'loading' | 'done';
  source?: Source;
  result?: T;
}

interface CoachPanelProps {
  context: CoachContext;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

const SUGGESTED = [
  'Is it safe to take my child to the park this evening?',
  'Which room should we sleep in and how do we keep it clean?',
  'What should an asthma patient at home do today?',
];

function SourceBadge({ source }: { source?: Source }) {
  if (!source) return null;
  return (
    <p className={`badge badge-${source}`}>
      {source === 'gemini'
        ? 'Written by Gemini from your numbers'
        : 'Offline explanation — AI coach unavailable'}
    </p>
  );
}

/** Calls the coach and falls back to the deterministic explanation on any failure. */
function useCoach<M extends CoachMode>(mode: M, fallback: () => CoachResult<M>) {
  const [outcome, setOutcome] = useState<Outcome<CoachResult<M>>>({ status: 'idle' });
  const run = async (context: CoachContext, language: Language, question?: string) => {
    setOutcome((current) => ({ ...current, status: 'loading' }));
    try {
      const result = await askCoach({ mode, language, context, ...(question ? { question } : {}) });
      setOutcome({ status: 'done', source: 'gemini', result });
    } catch {
      setOutcome({ status: 'done', source: 'offline', result: fallback() });
    }
  };
  return [outcome, run] as const;
}

export default function CoachPanel({ context, language, onLanguageChange }: CoachPanelProps) {
  const questionId = useId();
  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState('');
  const [plan, runPlan] = useCoach('plan', () => fallbackPlan(context));
  const [answer, runAsk] = useCoach('ask', () => fallbackAnswer(context));
  const [advisory, runAdvisory] = useCoach('community', () => fallbackAdvisory(context, language));

  const ask = (event: FormEvent) => {
    event.preventDefault();
    if (question.trim().length >= 3) void runAsk(context, language, question.trim());
  };

  const share = async (item: CoachAdvisory) => {
    const text = `${item.title}\n\n${item.message}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: item.title, text });
        setCopied('Shared.');
      } else {
        await navigator.clipboard.writeText(text);
        setCopied('Copied — paste it into your group chat.');
      }
    } catch {
      setCopied('Could not share automatically; select the text and copy it.');
    }
  };

  return (
    <div className="grid">
      <section className="card span-2" aria-labelledby="coach-heading">
        <div className="card-head">
          <h2 id="coach-heading">Ask Saans</h2>
          <SelectField<Language>
            label="Reply language"
            value={language}
            onChange={onLanguageChange}
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी (Hindi)' },
            ]}
          />
        </div>
        <p className="hint">
          Gemini only sees the numbers Saans calculated (AQI, your dose, top swaps and room hacks) —
          never your exact location or personal details.
        </p>
      </section>

      <section
        className="card"
        aria-labelledby="plan-heading"
        aria-busy={plan.status === 'loading'}
      >
        <h2 id="plan-heading">My plan for today</h2>
        <button
          type="button"
          className="button"
          disabled={plan.status === 'loading'}
          onClick={() => void runPlan(context, language)}
        >
          {plan.status === 'loading'
            ? 'Writing your plan…'
            : plan.result
              ? 'Rewrite my plan'
              : 'Write my plan'}
        </button>
        <div aria-live="polite">
          {plan.result ? <PlanView plan={plan.result} source={plan.source} /> : null}
        </div>
      </section>

      <section
        className="card"
        aria-labelledby="ask-heading"
        aria-busy={answer.status === 'loading'}
      >
        <h2 id="ask-heading">Ask a question</h2>
        <form onSubmit={ask} className="ask-form">
          <label htmlFor={questionId}>Your question</label>
          <textarea
            id={questionId}
            rows={3}
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. Can grandpa go for his evening walk?"
          />
          <div className="suggestions">
            {SUGGESTED.map((text) => (
              <button
                key={text}
                type="button"
                className="chip chip-button"
                onClick={() => setQuestion(text)}
              >
                {text}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="button"
            disabled={answer.status === 'loading' || question.trim().length < 3}
          >
            {answer.status === 'loading' ? 'Thinking…' : 'Ask'}
          </button>
        </form>
        <div aria-live="polite">
          {answer.result ? (
            <AnswerView answer={answer.result} source={answer.source} onFollowUp={setQuestion} />
          ) : null}
        </div>
      </section>

      <section
        className="card span-2"
        aria-labelledby="advisory-heading"
        aria-busy={advisory.status === 'loading'}
      >
        <h2 id="advisory-heading">Community advisory</h2>
        <p className="hint">
          A short message for your RWA, school or office group with today&apos;s clean window and
          collective actions.
        </p>
        <button
          type="button"
          className="button"
          disabled={advisory.status === 'loading'}
          onClick={() => void runAdvisory(context, language)}
        >
          {advisory.status === 'loading' ? 'Drafting…' : 'Draft advisory'}
        </button>
        <div aria-live="polite">
          {advisory.result ? (
            <div className="advisory">
              <SourceBadge source={advisory.source} />
              <h3>{advisory.result.title}</h3>
              <p className="advisory-text">{advisory.result.message}</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => advisory.result && void share(advisory.result)}
              >
                Share or copy
              </button>
              <p role="status" className="hint">
                {copied}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PlanView({ plan, source }: { plan: CoachPlan; source?: Source }) {
  return (
    <div className="plan">
      <SourceBadge source={source} />
      <p className="lead">{plan.headline}</p>
      <ol>
        {plan.steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.why}</p>
            <p className="impact">{step.impact}</p>
          </li>
        ))}
      </ol>
      <p className="hint">{plan.caution}</p>
    </div>
  );
}

function AnswerView({
  answer,
  source,
  onFollowUp,
}: {
  answer: CoachAnswer;
  source?: Source;
  onFollowUp: (q: string) => void;
}) {
  return (
    <div className="answer">
      <SourceBadge source={source} />
      <p>{answer.answer}</p>
      {answer.followUps.length > 0 ? (
        <div className="suggestions" aria-label="Follow-up questions">
          {answer.followUps.map((text) => (
            <button
              key={text}
              type="button"
              className="chip chip-button"
              onClick={() => onFollowUp(text)}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
