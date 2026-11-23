import {
  BREATHING_RATE,
  MASK_FACTOR,
  MODES,
  PERSONA_FACTOR,
  PM25_PER_CIGARETTE_DAY,
  HOME_SOURCE_DUTY,
  SETTING_FACTOR,
  WHO_PM25_24H,
} from './constants';
import { indoorConcentration, type ActiveSources } from './indoor';
import type { Activity, ActivityDose, DayBudget, Persona, RoomSetup } from './types';

export interface ExposureContext {
  /** 24 hourly outdoor PM2.5 values for the day being planned (index = local hour). */
  pm25: readonly number[];
  room: RoomSetup;
  persona: Persona;
}

export const SLOTS_PER_DAY = 96; // quarter hours
export const FILLER_PREFIX = 'filler-';

const mod = (value: number, base: number) => ((value % base) + base) % base;

/** Time-weighted mean of an hourly series over [start, start + duration), wrapping past midnight. */
export function windowAverage(series: readonly number[], start: number, duration: number): number {
  if (series.length === 0 || duration <= 0) return 0;
  const steps = Math.max(1, Math.round(duration * 4));
  let sum = 0;
  for (let i = 0; i < steps; i += 1) {
    const hour = Math.floor(mod(start + i / 4, 24));
    sum += series[hour % series.length] ?? 0;
  }
  return sum / steps;
}

const sourcesFor = (activity: Activity): ActiveSources => {
  switch (activity.kind) {
    case 'cooking':
      return { cooking: true };
    case 'sleep':
      return { mosquitoCoil: true };
    case 'home':
      // Incense and cigarettes burn for only part of the time spent at home.
      return { incense: HOME_SOURCE_DUTY, smoking: HOME_SOURCE_DUTY };
    default:
      return {};
  }
};

/** PM2.5 concentration in the micro-environment where the activity happens. */
export function activityConcentration(activity: Activity, ctx: ExposureContext): number {
  const outdoor = windowAverage(ctx.pm25, activity.start, activity.duration);
  const mask = MASK_FACTOR[activity.mask ?? 'none'];
  switch (activity.setting) {
    case 'home':
      return indoorConcentration(ctx.room, outdoor, sourcesFor(activity), activity.extraCadr ?? 0);
    case 'transit':
      return outdoor * MODES[activity.mode ?? 'bus'].exposureFactor * mask;
    case 'outdoor-roadside':
    case 'outdoor-green':
      return outdoor * SETTING_FACTOR[activity.setting] * mask;
    default:
      return outdoor * SETTING_FACTOR[activity.setting];
  }
}

export function activityDose(activity: Activity, ctx: ExposureContext): ActivityDose {
  const concentration = activityConcentration(activity, ctx);
  const volume = BREATHING_RATE[activity.effort] * PERSONA_FACTOR[ctx.persona] * activity.duration;
  return { activity, concentration, volume, dose: concentration * volume };
}

/** Quarter-hour slots an activity occupies (wrapping past midnight). */
export function occupiedSlots(activity: Pick<Activity, 'start' | 'duration'>): number[] {
  const first = Math.round(activity.start * 4);
  const count = Math.max(1, Math.round(activity.duration * 4));
  return Array.from({ length: count }, (_, i) => mod(first + i, SLOTS_PER_DAY));
}

export function overlaps(
  a: Pick<Activity, 'start' | 'duration'>,
  others: readonly Activity[],
): boolean {
  const taken = new Set(others.flatMap(occupiedSlots));
  return occupiedSlots(a).some((slot) => taken.has(slot));
}

/** Fills every unplanned part of the day with "At home" so the budget always covers 24 h. */
export function fillGaps(activities: readonly Activity[]): Activity[] {
  const taken = new Set(activities.flatMap(occupiedSlots));
  const fillers: Activity[] = [];
  let runStart: number | null = null;
  for (let slot = 0; slot <= SLOTS_PER_DAY; slot += 1) {
    const free = slot < SLOTS_PER_DAY && !taken.has(slot);
    if (free && runStart === null) runStart = slot;
    if (!free && runStart !== null) {
      fillers.push({
        id: `${FILLER_PREFIX}${runStart}`,
        label: 'At home',
        kind: 'home',
        start: runStart / 4,
        duration: (slot - runStart) / 4,
        setting: 'home',
        effort: 'rest',
      });
      runStart = null;
    }
  }
  return [...activities, ...fillers].sort((a, b) => a.start - b.start);
}

export function dayBudget(activities: readonly Activity[], ctx: ExposureContext): DayBudget {
  const items = fillGaps(activities).map((activity) => activityDose(activity, ctx));
  const totalDose = items.reduce((sum, item) => sum + item.dose, 0);
  const totalVolume = items.reduce((sum, item) => sum + item.volume, 0);
  const hours = items.reduce((sum, item) => sum + item.activity.duration, 0) || 24;
  const exposureAvg =
    items.reduce((sum, item) => sum + item.concentration * item.activity.duration, 0) / hours;
  return {
    items,
    totalDose,
    totalVolume,
    exposureAvg,
    cigarettes: exposureAvg / PM25_PER_CIGARETTE_DAY,
    whoMultiple: exposureAvg / WHO_PM25_24H,
  };
}
