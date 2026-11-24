import { useState, type ReactElement, type SyntheticEvent } from 'react';
import { quarter } from '../../core/plan';
import type { Activity } from '../../core/types';
import { NumberField, SelectField } from '../FormFields';

/** Activities a family most often wants to try at a different time or place. */
export const ACTIVITY_PRESETS = {
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
type PresetKey = keyof typeof ACTIVITY_PRESETS;

const PRESET_OPTIONS = (Object.keys(ACTIVITY_PRESETS) as PresetKey[]).map((key) => ({
  value: key,
  label: ACTIVITY_PRESETS[key].label,
}));

/** Builds a new activity from a preset, rounding the duration to the planner's quarter hours. */
export function createActivity(
  preset: PresetKey,
  start: number,
  minutes: number,
  id: string,
): Activity {
  return {
    ...ACTIVITY_PRESETS[preset],
    id,
    start,
    duration: Math.max(0.25, quarter(minutes / 60)),
  };
}

export function AddActivityForm({
  onAdd,
}: Readonly<{ onAdd: (activity: Activity) => void }>): ReactElement {
  const [preset, setPreset] = useState<PresetKey>('park');
  const [start, setStart] = useState(17);
  const [minutes, setMinutes] = useState(30);

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAdd(createActivity(preset, start, minutes, `custom-${Date.now().toString(36)}`));
  };

  return (
    <form className="add-activity" onSubmit={submit} aria-label="Add an activity">
      <SelectField label="Activity" value={preset} onChange={setPreset} options={PRESET_OPTIONS} />
      <NumberField
        label="Starts at"
        unit="hour"
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
