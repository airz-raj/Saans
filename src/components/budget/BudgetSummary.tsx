import { useId, type ReactElement } from 'react';
import { budgetHeadline, formatDose } from '../../core/explain';
import type { DayBudget } from '../../core/types';
import { Stat } from '../fields';

const DAYS = ['Today', 'Tomorrow'] as const;

interface BudgetSummaryProps {
  budget: DayBudget;
  day: 0 | 1;
  onDayChange: (day: 0 | 1) => void;
}

/** Headline numbers for the day plus the today/tomorrow switch. */
export function BudgetSummary({ budget, day, onDayChange }: BudgetSummaryProps): ReactElement {
  const groupName = useId();
  return (
    <section className="card span-2" aria-labelledby="budget-heading">
      <div className="card-head">
        <h2 id="budget-heading">Breath budget</h2>
        <fieldset className="segmented">
          <legend className="visually-hidden">Day to plan</legend>
          {DAYS.map((label, index) => (
            <label key={label}>
              <input
                type="radio"
                name={groupName}
                checked={day === index}
                onChange={() => onDayChange(index === 0 ? 0 : 1)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="stats">
        <Stat value={formatDose(budget.totalDose)} label="PM2.5 inhaled over 24 h" />
        <Stat
          value={`≈ ${budget.cigarettes.toFixed(1)}`}
          label="cigarettes' worth of smoke"
          tone="warn"
        />
        <Stat value={`${budget.whoMultiple.toFixed(1)}×`} label="the WHO daily guideline" />
      </div>
      <p className="lead">{budgetHeadline(budget)}</p>
      <p className="hint">
        Dose = air quality where you are × how hard you breathe × time. Cigarette equivalence uses
        the rule of thumb that 22 µg/m³ of PM2.5 for a day ≈ one cigarette. Estimates for planning,
        not medical advice.
      </p>
    </section>
  );
}
