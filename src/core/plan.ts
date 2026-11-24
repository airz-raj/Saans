import { MODES } from './constants';
import { overlaps } from './exposure';
import type { Activity, Profile } from './types';

/** Rounds hours to the nearest quarter hour. */
export const quarter = (hours: number): number => Math.round(hours * 4) / 4;

export const travelHours = (mode: keyof typeof MODES, km: number): number =>
  Math.max(0.25, quarter(km / MODES[mode].speedKmh));

/** Builds a realistic starting day for the household from its profile. */
export function buildDefaultPlan(profile: Profile): Activity[] {
  const plan: Activity[] = [];
  let errandStart = 17.5;
  const add = (activity: Activity) => {
    if (activity.duration > 0 && !overlaps(activity, plan)) plan.push(activity);
  };
  const isChild = profile.persona === 'child';

  add({
    id: 'sleep',
    label: 'Sleep',
    kind: 'sleep',
    start: isChild ? 21.5 : 23,
    duration: isChild ? 9 : 7.5,
    setting: 'home',
    effort: 'sleep',
  });

  if (profile.commuteMode !== 'none' && profile.commuteKm > 0) {
    const mode = profile.commuteMode;
    const leg = travelHours(mode, profile.commuteKm);
    const base = {
      kind: 'commute' as const,
      setting: 'transit' as const,
      effort: MODES[mode].effort,
      mode,
      distanceKm: profile.commuteKm,
      duration: leg,
    };
    add({
      ...base,
      id: 'commute-out',
      label: isChild ? 'Trip to school' : 'Commute to work',
      start: quarter(profile.departHour),
    });
    const dayStart = quarter(profile.departHour + leg);
    const dayEnd = quarter(profile.returnHour);
    add({
      id: 'day',
      label: isChild ? 'School' : 'Work',
      kind: 'work',
      start: dayStart,
      duration: Math.max(0, dayEnd - dayStart),
      setting: isChild ? 'school' : 'office',
      effort: isChild ? 'light' : 'rest',
    });
    add({ ...base, id: 'commute-back', label: 'Trip home', start: dayEnd });
    errandStart = quarter(dayEnd + leg + 0.25);
  }

  if (profile.exerciseHour !== null && profile.exerciseMinutes > 0) {
    const indoors = profile.exerciseSetting === 'home';
    add({
      id: 'exercise',
      label: indoors ? 'Home workout' : 'Walk / jog',
      kind: 'exercise',
      start: quarter(profile.exerciseHour),
      duration: quarter(profile.exerciseMinutes / 60) || 0.25,
      setting: indoors ? 'home' : profile.exerciseSetting,
      effort: 'moderate',
    });
  }

  if (profile.room.cookingFuel !== 'none') {
    add({
      id: 'cooking',
      label: 'Cooking dinner',
      kind: 'cooking',
      start: 19.5,
      duration: 0.75,
      setting: 'home',
      effort: 'light',
    });
  }

  add({
    id: 'errand',
    label: 'Market / errands',
    kind: 'errand',
    start: errandStart,
    duration: 0.5,
    setting: 'outdoor-roadside',
    effort: 'light',
  });

  return plan.sort((a, b) => a.start - b.start);
}
