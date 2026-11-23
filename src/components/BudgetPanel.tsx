import { useId, useState, type FormEvent } from 'react';
import { MODES } from '../core/constants';
import { budgetHeadline, explainSwap, formatConc, formatDose, percent } from '../core/explain';
import { FILLER_PREFIX, type ExposureContext } from '../core/exposure';
import { formatHour } from '../core/forecast';
import type { Activity, DayBudget, Setting, Swap } from '../core/types';
import { NumberField, SelectField, Stat } from './fields';

const SETTING_LABEL: Record<Setting, string> = {
  home: 'Indoors at home',
  office: 'Office',
  school: 'School',
  'outdoor-roadside': 'Outdoors by a road',
  'outdoor-green': 'Park / green area',
  transit: 'Travelling',
};

const PRESETS = {
  jog: {
    label: 'Walk / jog by the road',
    kind: 'exercise',
    setting: 'outdoor-roadside',
    effort: 'moderate',
  },
  park: { label: 'Walk in the park', kind: 'exercise', setting: 'outdoor-green', effort: 'light' },
  play: { label: 'Outdoor play', kind: 'exercise', setting: 'outdoor-green', effort: 'vigorous' },
  errand: {
    label: 'Errand on a main road',
    kind: 'errand',
    setting: 'outdoor-roadside',
    effort: 'light',
  },
  workout: { label: 'Home workout', kind: 'exercise', setting: 'home', effort: 'moderate' },
} as const satisfies Record<string, Pick<Activity, 'label' | 'kind' | 'setting' | 'effort'>>;
type PresetKey = keyof typeof PRESETS;

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

const describeActivity = (activity: Activity) =>
  activity.setting === 'transit' && activity.mode
    ? MODES[activity.mode].label
    : SETTING_LABEL[activity.setting];

export function BudgetPanel(props: BudgetPanelProps) {
  const { budget, swaps, exposure, day } = props;
  const dayName = useId();
  const [announcement, setAnnouncement] = useState('');
  const maxDose = Math.max(1, ...budget.items.map((item) => item.dose));

  const apply = (swap: Swap) => {
    props.onApply(swap);
    setAnnouncement(`Applied: ${swap.title}. Saves about ${formatDose(swap.doseSaved)}.`);
  };

  return (
    <div className="grid">
      <section className="card span-2" aria-labelledby="budget-heading">
        <div className="card-head">
          <h2 id="budget-heading">Breath budget</h2>
          <fieldset className="segmented">
            <legend className="visually-hidden">Day to plan</legend>
            {(['Today', 'Tomorrow'] as const).map((label, index) => (
              <label key={label}>
                <input
                  type="radio"
                  name={dayName}
                  checked={day === index}
                  onChange={() => props.onDayChange(index as 0 | 1)}
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
          the rule of thumb that 22 µg/m³ of PM2.5 for a day ≈ one cigarette. Estimates for
          planning, not medical advice.
        </p>
      </section>

      <section className="card" aria-labelledby="swaps-heading">
        <h2 id="swaps-heading">Swaps that cut your dose</h2>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
        {swaps.length === 0 ? (
          <p>Your day is already well planned for today&apos;s air. 🎉</p>
        ) : (
          <ol className="swap-list">
            {swaps.map((swap) => (
              <li key={swap.id} className="swap">
                <h3>{swap.title}</h3>
                <p>{explainSwap(swap, exposure)}</p>
                <ul className="chips" aria-label="Impact">
                  <li className="chip chip-good">
                    −{percent(swap.doseSaved, swap.doseBefore)}% dose
                  </li>
                  {Math.abs(swap.co2Saved) >= 0.01 ? (
                    <li className={`chip ${swap.co2Saved > 0 ? 'chip-good' : 'chip-warn'}`}>
                      {swap.co2Saved > 0 ? '−' : '+'}
                      {Math.abs(swap.co2Saved).toFixed(2)} kg CO₂
                    </li>
                  ) : null}
                  {swap.minutesDelta !== 0 ? (
                    <li className="chip">
                      {swap.minutesDelta > 0 ? '+' : ''}
                      {swap.minutesDelta} min
                    </li>
                  ) : null}
                </ul>
                <button type="button" className="button" onClick={() => apply(swap)}>
                  Apply to my day
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card" aria-labelledby="timeline-heading">
        <div className="card-head">
          <h2 id="timeline-heading">Your day</h2>
          <button type="button" className="button secondary" onClick={props.onReset}>
            Reset to usual day
          </button>
        </div>
        <ol className="timeline">
          {budget.items.map(({ activity, dose, concentration }) => {
            const filler = activity.id.startsWith(FILLER_PREFIX);
            return (
              <li key={activity.id} className={filler ? 'timeline-item filler' : 'timeline-item'}>
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
                    {formatDose(dose)} ({percent(dose, budget.totalDose)}%)
                  </span>
                </div>
                {filler ? (
                  <span className="icon-spacer" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${activity.label}`}
                    onClick={() => props.onRemove(activity.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <AddActivity onAdd={props.onAdd} />
      </section>
    </div>
  );
}

function AddActivity({ onAdd }: { onAdd: (activity: Activity) => void }) {
  const [preset, setPreset] = useState<PresetKey>('park');
  const [start, setStart] = useState(17);
  const [minutes, setMinutes] = useState(30);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAdd({
      ...PRESETS[preset],
      id: `custom-${Date.now().toString(36)}`,
      start,
      duration: Math.max(0.25, Math.round((minutes / 60) * 4) / 4),
    });
  };

  return (
    <form className="add-activity" onSubmit={submit} aria-label="Add an activity">
      <SelectField
        label="Activity"
        value={preset}
        onChange={setPreset}
        options={(Object.keys(PRESETS) as PresetKey[]).map((key) => ({
          value: key,
          label: PRESETS[key].label,
        }))}
      />
      <NumberField
        label="Starts at"
        unit="hour, 0–23"
        value={start}
        onChange={setStart}
        min={0}
        max={23}
      />
      <NumberField
        label="Duration"
        unit="min"
        value={minutes}
        onChange={setMinutes}
        min={15}
        max={240}
        step={15}
      />
      <button type="submit" className="button secondary">
        Add
      </button>
    </form>
  );
}
