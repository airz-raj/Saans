import { useMemo } from 'react';
import { computeAqi } from '../core/aqi';
import { buildCoachContext, type CoachContext } from '../core/coach';
import { dayBudget, type ExposureContext } from '../core/exposure';
import {
  dayPm25,
  formatHour,
  outlook,
  pointHour,
  type Outlook,
  type TimeWindow,
} from '../core/forecast';
import { rankHomeHacks, type HomeHack } from '../core/indoor';
import { suggestSwaps } from '../core/optimizer';
import type { Activity, AirSnapshot, AqiResult, DayBudget, Profile, Swap } from '../core/types';

export interface Insights {
  aqi: AqiResult;
  outlook: Outlook;
  exposure: ExposureContext;
  budget: DayBudget;
  swaps: Swap[];
  hacks: HomeHack[];
  coachContext: CoachContext;
  windowLabel: (window: TimeWindow | null) => string | null;
}

/** All model results for the current inputs, memoised so each runs only when its inputs change. */
export function useInsights(
  snapshot: AirSnapshot,
  profile: Profile,
  plan: readonly Activity[],
  day: 0 | 1,
): Insights {
  // Read nested values once so memo dependencies stay precise (and are not mistaken for refs).
  const { current: now, place } = snapshot;
  const nowPm25 = now.pm2_5;
  const aqi = useMemo(() => computeAqi(now), [now]);
  const next24 = useMemo(() => outlook(snapshot), [snapshot]);

  const exposure = useMemo<ExposureContext>(
    () => ({ pm25: dayPm25(snapshot, day), room: profile.room, persona: profile.persona }),
    [snapshot, day, profile.room, profile.persona],
  );
  const budget = useMemo(() => dayBudget(plan, exposure), [plan, exposure]);
  const swaps = useMemo(() => suggestSwaps(plan, exposure), [plan, exposure]);
  const hacks = useMemo(
    () => rankHomeHacks(profile.room, nowPm25, 'evening'),
    [profile.room, nowPm25],
  );

  const windowLabel = useMemo(
    () => (window: TimeWindow | null) => {
      if (!window) return null;
      const first = next24.hours[window.index];
      if (!first) return null;
      const start = pointHour(first);
      return `${formatHour(start)}–${formatHour(start + window.length)}`;
    },
    [next24],
  );

  const coachContext = useMemo(
    () =>
      buildCoachContext({
        placeName: place.name,
        aqi,
        pm25Now: nowPm25,
        cleanWindow: windowLabel(next24.cleanest),
        worstWindow: windowLabel(next24.dirtiest),
        profile,
        budget,
        swaps,
        hacks,
      }),
    [place.name, aqi, nowPm25, next24, windowLabel, profile, budget, swaps, hacks],
  );

  return { aqi, outlook: next24, exposure, budget, swaps, hacks, coachContext, windowLabel };
}
