import type { ReactElement } from 'react';
import type { ExposureContext } from '../core/exposure';
import type { Activity, DayBudget, Swap } from '../core/types';
import { BudgetSummary } from './budget/BudgetSummary';
import { DayTimeline } from './budget/DayTimeline';
import { SwapList } from './budget/SwapList';

interface BudgetPanelProps {
  budget: DayBudget;
  swaps: readonly Swap[];
  exposure: ExposureContext;
  day: 0 | 1;
  onDayChange: (day: 0 | 1) => void;
  onApply: (swap: Swap) => void;
  onRemove: (id: string) => void;
  onAdd: (activity: Activity) => void;
  onReset: () => void;
}

/** Breath budget: what the day costs the lungs, and the swaps that lower it. */
export function BudgetPanel(props: Readonly<BudgetPanelProps>): ReactElement {
  return (
    <div className="grid">
      <BudgetSummary budget={props.budget} day={props.day} onDayChange={props.onDayChange} />
      <SwapList swaps={props.swaps} exposure={props.exposure} onApply={props.onApply} />
      <DayTimeline
        budget={props.budget}
        onRemove={props.onRemove}
        onAdd={props.onAdd}
        onReset={props.onReset}
      />
    </div>
  );
}
