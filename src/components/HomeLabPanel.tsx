import { useMemo, useState } from 'react';
import { categoryFor, subIndex } from '../core/aqi';
import { INDOOR } from '../core/constants';
import { formatConc, MYTHS, percent } from '../core/explain';
import {
  indoorConcentration,
  MOMENT_SOURCES,
  rankHomeHacks,
  type HomeHack,
  type Moment,
} from '../core/indoor';
import type { CookingFuel, RoomSetup, WindowHabit } from '../core/types';
import { NumberField, SelectField, Stat, Toggle } from './fields';

interface HomeLabPanelProps {
  room: RoomSetup;
  outdoorPm25: number;
  onRoomChange: (room: RoomSetup) => void;
}

const MOMENTS: { value: Moment; label: string }[] = [
  { value: 'evening', label: 'Evening at home' },
  { value: 'cooking', label: 'While cooking' },
  { value: 'sleeping', label: 'While sleeping' },
];

export function HomeLabPanel({ room, outdoorPm25, onRoomChange }: HomeLabPanelProps) {
  const [moment, setMoment] = useState<Moment>('evening');
  const [announcement, setAnnouncement] = useState('');
  const set = <K extends keyof RoomSetup>(key: K, value: RoomSetup[K]) =>
    onRoomChange({ ...room, [key]: value });

  const indoor = useMemo(
    () => indoorConcentration(room, outdoorPm25, MOMENT_SOURCES[moment]),
    [room, outdoorPm25, moment],
  );
  const hacks = useMemo(
    () => rankHomeHacks(room, outdoorPm25, moment),
    [room, outdoorPm25, moment],
  );
  const scale = Math.max(indoor, outdoorPm25, 1);

  const adopt = (hack: HomeHack) => {
    onRoomChange({ ...room, ...hack.patch, purifierCadr: room.purifierCadr + hack.extraCadr });
    setAnnouncement(`Adopted: ${hack.title}. Indoor PM2.5 now about ${formatConc(hack.after)}.`);
  };

  return (
    <div className="grid">
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
          <SelectField<WindowHabit>
            label="Windows usually"
            value={room.windows}
            onChange={(v) => set('windows', v)}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
              { value: 'sealed', label: 'Closed and gaps sealed' },
            ]}
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
          <SelectField<CookingFuel>
            label="Cooking fuel"
            value={room.cookingFuel}
            onChange={(v) => set('cookingFuel', v)}
            options={[
              { value: 'lpg', label: 'LPG / PNG gas' },
              { value: 'induction', label: 'Induction / electric' },
              { value: 'biomass', label: 'Wood, dung or coal' },
              { value: 'none', label: "We don't cook here" },
            ]}
          />
        </div>
        <fieldset className="toggles">
          <legend>Also in this home</legend>
          <Toggle
            label="Kitchen chimney / exhaust fan"
            checked={room.kitchenExhaust}
            onChange={(v) => set('kitchenExhaust', v)}
          />
          <Toggle
            label="Incense or dhoop"
            checked={room.incense}
            onChange={(v) => set('incense', v)}
          />
          <Toggle
            label="Mosquito coil at night"
            checked={room.mosquitoCoil}
            onChange={(v) => set('mosquitoCoil', v)}
          />
          <Toggle
            label="Someone smokes indoors"
            checked={room.smoking}
            onChange={(v) => set('smoking', v)}
          />
        </fieldset>
      </section>

      <section className="card" aria-labelledby="indoor-heading">
        <div className="card-head">
          <h2 id="indoor-heading">Indoor air</h2>
          <SelectField label="Moment" value={moment} onChange={setMoment} options={MOMENTS} />
        </div>
        <div className="stats" aria-live="polite">
          <Stat
            value={formatConc(indoor)}
            label={`indoors · ${categoryFor(subIndex('pm2_5', indoor) ?? 0)}`}
          />
          <Stat value={formatConc(outdoorPm25)} label="outdoors now" />
          <Stat
            value={`${percent(indoor, outdoorPm25)}%`}
            label="of outdoor level"
            tone={indoor > outdoorPm25 ? 'warn' : 'good'}
          />
        </div>
        <div className="compare" aria-hidden="true">
          <div className="compare-row">
            <span>Indoor</span>
            <span className="compare-bar indoor" style={{ width: `${(indoor / scale) * 100}%` }} />
          </div>
          <div className="compare-row">
            <span>Outdoor</span>
            <span
              className="compare-bar outdoor"
              style={{ width: `${(outdoorPm25 / scale) * 100}%` }}
            />
          </div>
        </div>
        {indoor > outdoorPm25 ? (
          <p className="callout">
            Indoor sources make this room dirtier than the street right now. The fixes below help
            most.
          </p>
        ) : null}

        <h3>Hacks ranked for your room</h3>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
        {hacks.length === 0 ? (
          <p>Your room is already well set up for this moment.</p>
        ) : (
          <ol className="hack-list">
            {hacks.map((hack) => (
              <li key={hack.id} className="hack">
                <div>
                  <strong>{hack.title}</strong>
                  <p className="hint">{hack.how}</p>
                  <p>
                    {formatConc(hack.before)} → <strong>{formatConc(hack.after)}</strong> (−
                    {percent(hack.saved, hack.before)}%)
                  </p>
                </div>
                <button type="button" className="button secondary" onClick={() => adopt(hack)}>
                  I did this
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card span-2" aria-labelledby="myths-heading">
        <h2 id="myths-heading">Myth or fact?</h2>
        <div className="myths">
          {MYTHS.map((myth) => (
            <details key={myth.claim}>
              <summary>{myth.claim}</summary>
              <p>{myth.truth}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
