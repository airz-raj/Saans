import type { ReactElement } from 'react';
import { MODES } from '../core/constants';
import type { Persona, Profile, TransportMode } from '../core/types';
import { NumberField, SelectField, Toggle } from './fields';

interface HouseholdPanelProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onRebuild: () => void;
}

const MODE_OPTIONS = [
  { value: 'none' as const, label: 'No daily commute' },
  ...(Object.keys(MODES) as TransportMode[]).map((mode) => ({
    value: mode,
    label: MODES[mode].label,
  })),
];

type SetField = <K extends keyof Profile>(key: K, value: Profile[K]) => void;

interface SectionProps {
  profile: Profile;
  set: SetField;
}

function WhoSection({ profile, set }: SectionProps): ReactElement {
  return (
    <section className="card" aria-labelledby="who-heading">
      <h2 id="who-heading">Who is breathing?</h2>
      <SelectField<Persona>
        label="Plan the day for"
        value={profile.persona}
        onChange={(v) => set('persona', v)}
        options={[
          { value: 'adult', label: 'An adult' },
          { value: 'child', label: 'A school-age child' },
          { value: 'older', label: 'An older adult (60+)' },
        ]}
      />
      <div className="form-grid">
        <NumberField
          label="Children at home"
          value={profile.children}
          min={0}
          max={10}
          onChange={(v) => set('children', v)}
        />
        <NumberField
          label="Elders at home"
          value={profile.elders}
          min={0}
          max={10}
          onChange={(v) => set('elders', v)}
        />
      </div>
      <Toggle
        label="Someone has asthma, COPD, heart disease or is pregnant"
        checked={profile.sensitiveMember}
        onChange={(v) => set('sensitiveMember', v)}
      />
      <p className="hint">
        Saved only in this browser. Nothing here is sent anywhere except anonymous counts to the AI
        coach.
      </p>
    </section>
  );
}

function RoutineSection({
  profile,
  set,
  onRebuild,
}: SectionProps & { onRebuild: () => void }): ReactElement {
  const exercises = profile.exerciseHour !== null;
  return (
    <section className="card" aria-labelledby="routine-heading">
      <h2 id="routine-heading">Daily routine</h2>
      <div className="form-grid">
        <SelectField<TransportMode | 'none'>
          label="Commute by"
          value={profile.commuteMode}
          onChange={(v) => set('commuteMode', v)}
          options={MODE_OPTIONS}
        />
        <NumberField
          label="Distance one way"
          unit="km"
          value={profile.commuteKm}
          min={0}
          max={80}
          step={0.5}
          onChange={(v) => set('commuteKm', v)}
        />
        <NumberField
          label="Leave home at"
          unit="hour"
          value={profile.departHour}
          min={4}
          max={13}
          step={0.25}
          onChange={(v) => set('departHour', v)}
        />
        <NumberField
          label="Head back at"
          unit="hour"
          value={profile.returnHour}
          min={12}
          max={23}
          step={0.25}
          onChange={(v) => set('returnHour', v)}
        />
      </div>
      <Toggle
        label="Exercises or walks most days"
        checked={exercises}
        onChange={(v) => set('exerciseHour', v ? 7 : null)}
      />
      {exercises ? (
        <div className="form-grid">
          <NumberField
            label="Usually at"
            unit="hour"
            value={profile.exerciseHour ?? 7}
            min={5}
            max={21}
            step={0.25}
            onChange={(v) => set('exerciseHour', v)}
          />
          <NumberField
            label="For"
            unit="min"
            value={profile.exerciseMinutes}
            min={10}
            max={180}
            step={5}
            onChange={(v) => set('exerciseMinutes', v)}
          />
          <SelectField<Profile['exerciseSetting']>
            label="Where"
            value={profile.exerciseSetting}
            onChange={(v) => set('exerciseSetting', v)}
            options={[
              { value: 'outdoor-roadside', label: 'Along a road' },
              { value: 'outdoor-green', label: 'Park or campus' },
              { value: 'home', label: 'Indoors' },
            ]}
          />
        </div>
      ) : null}
      <button type="button" className="button" onClick={onRebuild}>
        Rebuild my day from these settings
      </button>
    </section>
  );
}

/** Household settings that drive the default day and every calculation. Saved on this device only. */
export function HouseholdPanel({
  profile,
  onChange,
  onRebuild,
}: HouseholdPanelProps): ReactElement {
  const set: SetField = (key, value) => onChange({ ...profile, [key]: value });
  return (
    <div className="grid">
      <WhoSection profile={profile} set={set} />
      <RoutineSection profile={profile} set={set} onRebuild={onRebuild} />
    </div>
  );
}
