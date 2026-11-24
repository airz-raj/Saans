import { useMemo, useState, type ReactElement } from 'react';
import { formatConc, MYTHS } from '../core/explain';
import {
  indoorConcentration,
  MOMENT_SOURCES,
  rankHomeHacks,
  type HomeHack,
  type Moment,
} from '../core/indoor';
import type { RoomSetup } from '../core/types';
import { SelectField } from './fields';
import { HackList } from './home/HackList';
import { IndoorReadout } from './home/IndoorReadout';
import { RoomForm } from './home/RoomForm';

interface HomeLabPanelProps {
  room: RoomSetup;
  outdoorPm25: number;
  onRoomChange: (room: RoomSetup) => void;
}

const MOMENTS: readonly { value: Moment; label: string }[] = [
  { value: 'evening', label: 'Evening at home' },
  { value: 'cooking', label: 'While cooking' },
  { value: 'sleeping', label: 'While sleeping' },
];

/** Applies a hack to the room: its settings change, and any added cleaner adds to the CADR. */
export const adoptHack = (room: RoomSetup, hack: HomeHack): RoomSetup => ({
  ...room,
  ...hack.patch,
  purifierCadr: room.purifierCadr + hack.extraCadr,
});

/** Home Air Lab: a physics model of the room and the fixes that matter most in it. */
export function HomeLabPanel({ room, outdoorPm25, onRoomChange }: HomeLabPanelProps): ReactElement {
  const [moment, setMoment] = useState<Moment>('evening');
  const [announcement, setAnnouncement] = useState('');

  const indoor = useMemo(
    () => indoorConcentration(room, outdoorPm25, MOMENT_SOURCES[moment]),
    [room, outdoorPm25, moment],
  );
  const hacks = useMemo(
    () => rankHomeHacks(room, outdoorPm25, moment),
    [room, outdoorPm25, moment],
  );

  const adopt = (hack: HomeHack) => {
    onRoomChange(adoptHack(room, hack));
    setAnnouncement(`Adopted: ${hack.title}. Indoor PM2.5 now about ${formatConc(hack.after)}.`);
  };

  return (
    <div className="grid">
      <RoomForm room={room} onChange={onRoomChange} />
      <section className="card" aria-labelledby="indoor-heading">
        <div className="card-head">
          <h2 id="indoor-heading">Indoor air</h2>
          <SelectField label="Moment" value={moment} onChange={setMoment} options={MOMENTS} />
        </div>
        <IndoorReadout indoor={indoor} outdoor={outdoorPm25} />
        <h3>Hacks ranked for your room</h3>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
        <HackList hacks={hacks} onAdopt={adopt} />
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
