import type { ReactElement } from 'react';
import { fallbackPlan, type CoachContext, type Language } from '../../core/coach';
import { useCoach } from '../../hooks/useCoach';
import { SourceBadge } from './SourceBadge';

interface PlanCardProps {
  context: CoachContext;
  language: Language;
}

const planButtonLabel = (loading: boolean, hasPlan: boolean): string => {
  if (loading) return 'Writing your plan…';
  return hasPlan ? 'Rewrite my plan' : 'Write my plan';
};

/** "My plan for today": a prioritised family plan written from the computed numbers. */
export function PlanCard({ context, language }: Readonly<PlanCardProps>): ReactElement {
  const [plan, run] = useCoach('plan', fallbackPlan);
  const loading = plan.status === 'loading';
  const label = planButtonLabel(loading, plan.result !== undefined);

  return (
    <section className="card" aria-labelledby="plan-heading" aria-busy={loading}>
      <h2 id="plan-heading">My plan for today</h2>
      <button
        type="button"
        className="button"
        disabled={loading}
        onClick={() => void run(context, language)}
      >
        {label}
      </button>
      <div aria-live="polite">
        {plan.result ? (
          <div className="plan" lang={language}>
            <SourceBadge source={plan.source} />
            <p className="lead">{plan.result.headline}</p>
            <ol>
              {plan.result.steps.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <p>{step.why}</p>
                  <p className="impact">{step.impact}</p>
                </li>
              ))}
            </ol>
            <p className="hint">{plan.result.caution}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
