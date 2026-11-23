import { INDOOR } from './constants';
import type { RoomSetup } from './types';

/**
 * Which indoor sources are burning at the moment being modelled, as a duty cycle:
 * `true`/1 = burning the whole time, 0.15 = burning 15% of the time, false/0 = off.
 */
export interface ActiveSources {
  cooking?: boolean | number;
  incense?: boolean | number;
  mosquitoCoil?: boolean | number;
  smoking?: boolean | number;
}

const duty = (value: boolean | number | undefined) =>
  typeof value === 'number' ? Math.min(1, Math.max(0, value)) : value ? 1 : 0;

export type Moment = 'cooking' | 'evening' | 'sleeping';

export const MOMENT_SOURCES: Record<Moment, ActiveSources> = {
  cooking: { cooking: true },
  evening: { incense: true, smoking: true },
  sleeping: { mosquitoCoil: true },
};

export const roomVolume = (room: Pick<RoomSetup, 'areaM2' | 'ceilingM'>) =>
  Math.max(1, room.areaM2 * room.ceilingM);

/** Total indoor source strength in µg/h for the sources that are both present and active. */
export function sourceStrength(room: RoomSetup, active: ActiveSources): number {
  const capture = room.kitchenExhaust ? INDOOR.kitchenExhaustCapture : 0;
  return (
    duty(active.cooking) * INDOOR.cookingSource[room.cookingFuel] * (1 - capture) +
    (room.incense ? duty(active.incense) * INDOOR.incenseSource : 0) +
    (room.mosquitoCoil ? duty(active.mosquitoCoil) * INDOOR.mosquitoCoilSource : 0) +
    (room.smoking ? duty(active.smoking) * INDOOR.smokingSource : 0)
  );
}

/**
 * Steady-state single-zone mass balance:
 *   C_in = (P·a·C_out + S/V) / (a + k + CADR/V)
 */
export function indoorConcentration(
  room: RoomSetup,
  outdoorPm25: number,
  active: ActiveSources = {},
  extraCadr = 0,
): number {
  const volume = roomVolume(room);
  const penetration = INDOOR.penetration[room.windows];
  const airChanges = INDOOR.airChanges[room.windows];
  const cleaning = (Math.max(0, room.purifierCadr) + Math.max(0, extraCadr)) / volume;
  const gain =
    penetration * airChanges * Math.max(0, outdoorPm25) + sourceStrength(room, active) / volume;
  return gain / (airChanges + INDOOR.depositionRate + cleaning);
}

export interface HomeHack {
  id: string;
  title: string;
  how: string;
  before: number;
  after: number;
  saved: number;
  /** Changes to apply to the room when the user adopts the hack. */
  patch: Partial<RoomSetup>;
  /** Portable cleaner added by the hack, m³/h. */
  extraCadr: number;
}

interface Candidate {
  id: string;
  title: string;
  how: string;
  when: boolean;
  patch?: Partial<RoomSetup>;
  extraCadr?: number;
}

/** Ranks practical hacks by how much each one lowers indoor PM2.5 for the chosen moment. */
export function rankHomeHacks(room: RoomSetup, outdoorPm25: number, moment: Moment): HomeHack[] {
  const active = MOMENT_SOURCES[moment];
  const before = indoorConcentration(room, outdoorPm25, active);

  const candidates: Candidate[] = [
    {
      id: 'close-windows',
      title: 'Keep windows shut during smog hours',
      how: 'Open them only in the clean window shown on the Today tab, for 10–15 minutes.',
      when: room.windows === 'open',
      patch: { windows: 'closed' },
    },
    {
      id: 'seal-gaps',
      title: 'Seal door and window gaps',
      how: 'Foam weather-strip or a rolled towel under the door slows smoggy air leaking in.',
      when: room.windows === 'closed',
      patch: { windows: 'sealed' },
    },
    {
      id: 'diy-filter',
      title: 'Build a box-fan filter (≈ ₹1,500)',
      how: 'Strap a MERV-13 / HEPA-grade AC filter to the intake side of a box or table fan and run it on medium.',
      when: true,
      extraCadr: INDOOR.diyFilterCadr,
    },
    {
      id: 'kitchen-exhaust',
      title: 'Run the chimney / exhaust while cooking',
      how: 'Switch it on before the pan heats and leave it on 10 minutes after.',
      when: moment === 'cooking' && room.cookingFuel !== 'none' && !room.kitchenExhaust,
      patch: { kitchenExhaust: true },
    },
    {
      id: 'switch-biomass',
      title: 'Move from wood/dung to LPG',
      how: 'Check eligibility for a subsidised LPG connection; keep the chulha for rare use outdoors.',
      when: moment === 'cooking' && room.cookingFuel === 'biomass',
      patch: { cookingFuel: 'lpg' },
    },
    {
      id: 'switch-induction',
      title: 'Use an induction cooktop for daily cooking',
      how: 'Induction has no flame, so it adds far fewer particles than a gas burner.',
      when: moment === 'cooking' && room.cookingFuel === 'lpg',
      patch: { cookingFuel: 'induction' },
    },
    {
      id: 'no-incense',
      title: 'Skip incense and dhoop on smog days',
      how: 'Use a diya with ghee or an electric diffuser instead.',
      when: moment === 'evening' && room.incense,
      patch: { incense: false },
    },
    {
      id: 'smoke-outside',
      title: 'Keep smoking out of the house',
      how: 'Second-hand smoke settles into a closed room and stays for hours.',
      when: moment === 'evening' && room.smoking,
      patch: { smoking: false },
    },
    {
      id: 'no-coil',
      title: 'Swap the mosquito coil for a net or plug-in vaporiser',
      how: 'A burning coil is one of the largest particle sources in a closed bedroom.',
      when: moment === 'sleeping' && room.mosquitoCoil,
      patch: { mosquitoCoil: false },
    },
  ];

  return candidates
    .filter((c) => c.when)
    .map((c) => {
      const next: RoomSetup = { ...room, ...c.patch };
      const extraCadr = c.extraCadr ?? 0;
      const after = indoorConcentration(next, outdoorPm25, active, extraCadr);
      return {
        id: c.id,
        title: c.title,
        how: c.how,
        before,
        after,
        saved: before - after,
        patch: c.patch ?? {},
        extraCadr,
      };
    })
    .filter((hack) => hack.saved > 0.5)
    .sort((a, b) => b.saved - a.saved);
}
