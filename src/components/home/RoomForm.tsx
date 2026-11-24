import type { ReactElement } from 'react';
import { INDOOR } from '../../core/constants';
import type { CookingFuel, RoomSetup, WindowHabit } from '../../core/types';
import { NumberField, SelectField, Toggle } from '../FormFields';

const WINDOW_OPTIONS: readonly { value: WindowHabit; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'sealed', label: 'Closed and gaps sealed' },
];

const FUEL_OPTIONS: readonly { value: CookingFuel; label: string }[] = [
  { value: 'lpg', label: 'LPG / PNG gas' },
  { value: 'induction', label: 'Induction / electric' },
  { value: 'biomass', label: 'Wood, dung or coal' },
  { value: 'none', label: "We don't cook here" },
];

type SourceKey = 'kitchenExhaust' | 'incense' | 'mosquitoCoil' | 'smoking';
const SOURCE_TOGGLES: readonly { key: SourceKey; label: string }[] = [
  { key: 'kitchenExhaust', label: 'Kitchen chimney / exhaust fan' },
  { key: 'incense', label: 'Incense or dhoop' },
  { key: 'mosquitoCoil', label: 'Mosquito coil at night' },
  { key: 'smoking', label: 'Someone smokes indoors' },
];

interface RoomFormProps {
  room: RoomSetup;
  onChange: (room: RoomSetup) => void;
}

/** Describes the room the household spends most time in; every change re-runs the model. */
export function RoomForm({ room, onChange }: Readonly<RoomFormProps>): ReactElement {
  const set = <K extends keyof RoomSetup>(key: K, value: RoomSetup[K]) =>
    onChange({ ...room, [key]: value });

  return (
    <section className="card" aria-labelledby="room-heading">
      <h2 id="room-heading">Your room</h2>
      <p className="hint">
        Describe the room you spend most time in. Changes are saved on this device only.
      </p>
      <div className="form-grid">
        <NumberField
          label="Floor area"
          unit="m²"
          value={room.areaM2}
          min={4}
          max={200}
          onChange={(v) => set('areaM2', v)}
        />
        <SelectField
          label="Windows usually"
          value={room.windows}
          onChange={(v) => set('windows', v)}
          options={WINDOW_OPTIONS}
        />
        <NumberField
          label="Air purifier CADR"
          unit="m³/h"
          value={room.purifierCadr}
          min={0}
          max={2000}
          step={10}
          onChange={(v) => set('purifierCadr', v)}
          hint={`0 if none. Box says CFM? Multiply by ${INDOOR.cfmToM3h}.`}
        />
        <SelectField
          label="Cooking fuel"
          value={room.cookingFuel}
          onChange={(v) => set('cookingFuel', v)}
          options={FUEL_OPTIONS}
        />
      </div>
      <fieldset className="toggles">
        <legend>Also in this home</legend>
        {SOURCE_TOGGLES.map(({ key, label }) => (
          <Toggle key={key} label={label} checked={room[key]} onChange={(v) => set(key, v)} />
        ))}
      </fieldset>
    </section>
  );
}
