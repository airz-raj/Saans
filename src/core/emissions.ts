import { MODES } from './constants';
import type { TransportMode } from './types';

/** PM2.5 released by one cigarette, g — used to make grams of smoke tangible. */
export const PM_PER_CIGARETTE_G = 0.012;
/** CO₂ a mature tree takes up in a week, kg (≈ 21 kg/year). */
export const TREE_CO2_PER_WEEK_KG = 0.4;
/** Length of North India's smog season used for seasonal totals, weeks (Nov–Feb). */
export const SMOG_SEASON_WEEKS = 16;

export interface Emission {
  co2Kg: number;
  pmG: number;
}

export function tripEmissions(mode: TransportMode, km: number): Emission {
  const info = MODES[mode];
  const distance = Math.max(0, km);
  return { co2Kg: info.co2PerKm * distance, pmG: info.pmPerKm * distance };
}

export interface LifestyleSwap {
  id: string;
  from: string;
  to: string;
  unit: string;
  /** Saved per occurrence. Negative co2Kg means the cleaner option emits more fossil CO₂. */
  co2Kg: number;
  pmG: number;
  note: string;
  defaultPerWeek: number;
}

export const LIFESTYLE_SWAPS: readonly LifestyleSwap[] = [
  {
    id: 'burn-waste',
    from: 'Burning dry leaves or household waste',
    to: 'Segregate, compost wet waste, hand dry waste to collection',
    unit: 'per kg not burned',
    co2Kg: 0.5,
    pmG: 8,
    note: 'Open burning is a large winter smog source; mixed waste with plastic also releases dioxins.',
    defaultPerWeek: 1,
  },
  {
    id: 'chulha-lpg',
    from: 'A day of cooking on a wood or dung chulha',
    to: 'Cooking on LPG or induction',
    unit: 'per day',
    co2Kg: -0.5,
    pmG: 20,
    note: 'LPG adds a little fossil CO₂, but removes most of the smoke the family breathes and emits.',
    defaultPerWeek: 0,
  },
  {
    id: 'diesel-genset',
    from: 'Running a small diesel generator for an hour',
    to: 'Inverter battery or rooftop solar backup',
    unit: 'per hour',
    co2Kg: 2.6,
    pmG: 2,
    note: 'Small gensets have little exhaust control and sit at breathing height in lanes.',
    defaultPerWeek: 0,
  },
  {
    id: 'idling',
    from: 'Engine idling for 10 minutes (signals, school pick-up)',
    to: 'Switching the engine off when stopped over a minute',
    unit: 'per 10 minutes',
    co2Kg: 0.2,
    pmG: 0.02,
    note: 'Idling exhaust collects right where children and walkers breathe.',
    defaultPerWeek: 3,
  },
  {
    id: 'short-car-trip',
    from: 'A 4 km round trip to the market by car',
    to: 'Walking or cycling in the clean window',
    unit: 'per trip',
    co2Kg: 4 * MODES.car.co2PerKm,
    pmG: 4 * MODES.car.pmPerKm,
    note: 'Short trips are the easiest to replace and the engine is least efficient when cold.',
    defaultPerWeek: 2,
  },
  {
    id: 'weekend-drive',
    from: 'A 30 km family outing by car',
    to: 'Metro or a shared ride with another family',
    unit: 'per outing',
    co2Kg: 30 * (MODES.car.co2PerKm - MODES.metro.co2PerKm),
    pmG: 30 * (MODES.car.pmPerKm - MODES.metro.pmPerKm),
    note: 'Fewer vehicles on winter evenings means less trapped exhaust under the inversion layer.',
    defaultPerWeek: 1,
  },
  {
    id: 'firecrackers',
    from: 'A 1 kg box of firecrackers',
    to: 'Diyas, lights or a community laser show',
    unit: 'per box',
    co2Kg: 0.5,
    pmG: 60,
    note: 'Crackers release a dense cloud of fine particles and metals at street level in one night.',
    defaultPerWeek: 0,
  },
];

/** Commute swap derived from the household's own mode and distance (both directions). */
export function commuteSwap(
  mode: TransportMode,
  km: number,
  alternative: TransportMode,
): LifestyleSwap {
  const current = tripEmissions(mode, km * 2);
  const next = tripEmissions(alternative, km * 2);
  return {
    id: `commute-${alternative}`,
    from: `Daily ${MODES[mode].label.toLowerCase()} commute (${km} km each way)`,
    to: `${MODES[alternative].label} for the same trip`,
    unit: 'per working day',
    co2Kg: current.co2Kg - next.co2Kg,
    pmG: current.pmG - next.pmG,
    note: 'Calculated from your own commute distance.',
    defaultPerWeek: 5,
  };
}

/** Lowest-emission realistic alternative for a commute, or null if already the cleanest. */
export function cleanestCommute(mode: TransportMode, km: number): TransportMode | null {
  const options = (Object.keys(MODES) as TransportMode[])
    .filter((m) => m !== mode && km <= MODES[m].maxKm)
    .sort((a, b) => MODES[a].co2PerKm - MODES[b].co2PerKm);
  const best = options[0];
  return best && MODES[best].co2PerKm < MODES[mode].co2PerKm ? best : null;
}

export interface SwapSelection {
  swap: LifestyleSwap;
  perWeek: number;
}

export function weeklyImpact(selections: readonly SwapSelection[]): Emission {
  return selections.reduce<Emission>(
    (total, { swap, perWeek }) => ({
      co2Kg: total.co2Kg + swap.co2Kg * Math.max(0, perWeek),
      pmG: total.pmG + swap.pmG * Math.max(0, perWeek),
    }),
    { co2Kg: 0, pmG: 0 },
  );
}

export function scaleImpact(weekly: Emission, households: number, weeks = 1): Emission {
  const factor = Math.max(0, households) * Math.max(0, weeks);
  return { co2Kg: weekly.co2Kg * factor, pmG: weekly.pmG * factor };
}
