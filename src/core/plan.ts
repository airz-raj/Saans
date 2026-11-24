import { MODES } from './constants';
import { overlaps } from './exposure';
import type { Activity, Profile } from './types';

/** Rounds hours to the nearest quarter hour. */
export const quarter = (hours: number): number => Math.round(hours * 4) / 4;

export const travelHours = (mode: keyof typeof MODES, km: number): number =>
  Math.max(0.25, quarter(km / MODES[mode].speedKmh));

/** Default timings, in local hours. */
const DEFAULT_TIMES = {
  adultSleep: { start: 23, duration: 7.5 },
  childSleep: { start: 21.5, duration: 9 },
  dinner: { start: 19.5, duration: 0.75 },
  errand: { start: 17.5, duration: 0.5 },
  /** Gap between getting home and heading out for errands. */
  errandBuffer: 0.25,
} as const;

const sleepBlock = (isChild: boolean): Activity => {
  const timing = isChild ? DEFAULT_TIMES.childSleep : DEFAULT_TIMES.adultSleep;
  return {
    id: 'sleep',
    label: 'Sleep',
    kind: 'sleep',
    ...timing,
    setting: 'home',
    effort: 'sleep',
  };
};

/** Outbound trip, the work/school day and the trip home; empty when there is no commute. */
function commuteBlocks(profile: Profile, isChild: boolean): Activity[] {
  if (profile.commuteMode === 'none' || profile.commuteKm <= 0) return [];
  const mode = profile.commuteMode;
  const leg = travelHours(mode, profile.commuteKm);
  const trip = {
    kind: 'commute',
    setting: 'transit',
    effort: MODES[mode].effort,
    mode,
    distanceKm: profile.commuteKm,
    duration: leg,
  } as const;
  const dayStart = quarter(profile.departHour + leg);
  const dayEnd = quarter(profile.returnHour);
  return [
    {
      ...trip,
      id: 'commute-out',
      label: isChild ? 'Trip to school' : 'Commute to work',
      start: quarter(profile.departHour),
    },
    {
      id: 'day',
      label: isChild ? 'School' : 'Work',
      kind: 'work',
      start: dayStart,
      duration: Math.max(0, dayEnd - dayStart),
      setting: isChild ? 'school' : 'office',
      effort: isChild ? 'light' : 'rest',
    },
    { ...trip, id: 'commute-back', label: 'Trip home', start: dayEnd },
  ];
}

function exerciseBlock(profile: Profile): Activity[] {
  if (profile.exerciseHour === null || profile.exerciseMinutes <= 0) return [];
  const indoors = profile.exerciseSetting === 'home';
  return [
    {
      id: 'exercise',
      label: indoors ? 'Home workout' : 'Walk / jog',
      kind: 'exercise',
      start: quarter(profile.exerciseHour),
      duration: Math.max(0.25, quarter(profile.exerciseMinutes / 60)),
      setting: indoors ? 'home' : profile.exerciseSetting,
      effort: 'moderate',
    },
  ];
}

function cookingBlock(profile: Profile): Activity[] {
  if (profile.room.cookingFuel === 'none') return [];
  return [
    {
      id: 'cooking',
      label: 'Cooking dinner',
      kind: 'cooking',
      ...DEFAULT_TIMES.dinner,
      setting: 'home',
      effort: 'light',
    },
  ];
}

/** Errands happen after the trip home, or late afternoon for people who stay local. */
function errandBlock(commute: readonly Activity[]): Activity {
  const tripHome = commute.find((a) => a.id === 'commute-back');
  const start = tripHome
    ? quarter(tripHome.start + tripHome.duration + DEFAULT_TIMES.errandBuffer)
    : DEFAULT_TIMES.errand.start;
  return {
    id: 'errand',
    label: 'Market / errands',
    kind: 'errand',
    start,
    duration: DEFAULT_TIMES.errand.duration,
    setting: 'outdoor-roadside',
    effort: 'light',
  };
}

/**
 * Builds a realistic starting day for the household from its profile. Blocks are added in
 * priority order; any block that would overlap an earlier one is skipped.
 */
export function buildDefaultPlan(profile: Profile): Activity[] {
  const isChild = profile.persona === 'child';
  const commute = commuteBlocks(profile, isChild);
  const candidates = [
    sleepBlock(isChild),
    ...commute,
    ...exerciseBlock(profile),
    ...cookingBlock(profile),
    errandBlock(commute),
  ];
  const plan: Activity[] = [];
  for (const activity of candidates) {
    if (activity.duration > 0 && !overlaps(activity, plan)) plan.push(activity);
  }
  return plan.sort((a, b) => a.start - b.start);
}
