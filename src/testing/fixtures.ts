import { DEFAULT_ROOM } from '../core/defaults';
import type { ExposureContext } from '../core/exposure';
import type { Activity, Swap } from '../core/types';

/** A flat 200 µg/m³ day for component tests. */
export const flatExposure: ExposureContext = {
  pm25: Array.from({ length: 24 }, () => 200),
  room: DEFAULT_ROOM,
  persona: 'adult',
};

export const metroCommute: Activity = {
  id: 'commute',
  label: 'Commute',
  kind: 'commute',
  start: 9,
  duration: 0.5,
  setting: 'transit',
  effort: 'rest',
  mode: 'metro',
  distanceKm: 8,
};

export function makeSwap(patch: Partial<Swap> = {}): Swap {
  return {
    id: 's',
    kind: 'mode',
    activityId: 'commute',
    title: 'Take the car (AC on recirculation) for “Commute”',
    before: metroCommute,
    after: { ...metroCommute, mode: 'car-ac' },
    doseBefore: 100,
    doseAfter: 40,
    doseSaved: 60,
    co2Saved: -0.5,
    minutesDelta: 12,
    ...patch,
  };
}
