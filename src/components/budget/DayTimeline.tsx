import type { ReactElement } from 'react';
import { MODES } from '../../core/constants';
import { formatConc, formatDose, percent } from '../../core/explain';
import { FILLER_PREFIX } from '../../core/exposure';
import { formatHour } from '../../core/forecast';
import type { Activity, ActivityDose, DayBudget, Setting } from '../../core/types';
import { AddActivityForm } from './AddActivityForm';

const SETTING_LABEL: Record<Setting, string> = {
  home: 'Indoors at home',
  office: 'Office',
  school: 'School',
  'outdoor-roadside': 'Outdoors by a road',
  'outdoor-green': 'Park / green area',
  transit: 'Travelling',
};

/** Where an activity happens, in words ("Metro", "Outdoors by a road"). */
export const describeActivity = (activity: Activity): string =>
  activity.setting === 'transit' && activity.mode
    ? MODES[activity.mode].label
    : SETTING_LABEL[activity.setting];

interface RowProps {
  item: ActivityDose;
  totalDose: number;
  maxDose: number;
  onRemove: (id: string) => void;
}

function TimelineRow({ item, totalDose, maxDose, onRemove }: Readonly<RowProps>): ReactElement {
  const { activity, dose, concentration } = item;
  const filler = activity.id.startsWith(FILLER_PREFIX);
  return (
    <li className={filler ? 'timeline-item filler' : 'timeline-item'}>
      <div className="timeline-time">
        {formatHour(activity.start)}–{formatHour(activity.start + activity.duration)}
      </div>
      <div className="timeline-body">
        <span className="timeline-label">{activity.label}</span>
        <span className="muted">
          {' '}
          · {describeActivity(activity)} · {formatConc(concentration)}
        </span>
        <div className="dose-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(2, (dose / maxDose) * 100)}%` }} />
        </div>
        <span className="timeline-dose">
          {formatDose(dose)} ({percent(dose, totalDose)}%)
        </span>
      </div>
      {filler ? (
        <span className="icon-spacer" aria-hidden="true" />
      ) : (
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${activity.label}`}
          onClick={() => onRemove(activity.id)}
        >
          ×
        </button>
      )}
    </li>
  );
}

interface DayTimelineProps {
  budget: DayBudget;
  onRemove: (id: string) => void;
  onAdd: (activity: Activity) => void;
  onReset: () => void;
}

/** The whole day, hour by hour, with each activity's share of the dose. */
export function DayTimeline({
  budget,
  onRemove,
  onAdd,
  onReset,
}: Readonly<DayTimelineProps>): ReactElement {
  const maxDose = Math.max(1, ...budget.items.map((item) => item.dose));
  return (
    <section className="card" aria-labelledby="timeline-heading">
      <div className="card-head">
        <h2 id="timeline-heading">Your day</h2>
        <button type="button" className="button secondary" onClick={onReset}>
          Reset to usual day
        </button>
      </div>
      <ol className="timeline">
        {budget.items.map((item) => (
          <TimelineRow
            key={item.activity.id}
            item={item}
            totalDose={budget.totalDose}
            maxDose={maxDose}
            onRemove={onRemove}
          />
        ))}
      </ol>
      <AddActivityForm onAdd={onAdd} />
    </section>
  );
}
