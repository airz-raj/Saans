import { AWAKE_HOURS } from './constants';
import type { AirSnapshot, HourPoint } from './types';

export interface TimeWindow {
  /** Index of the first hour in the series. */
  index: number;
  length: number;
  average: number;
}

const hourOf = (point: HourPoint) => Number(point.time.slice(11, 13));

/**
 * Finds the contiguous window of `length` hours with the lowest (or highest) mean value,
 * considering only windows whose every hour passes `allowed`. O(n·length).
 */
export function extremeWindow(
  series: readonly number[],
  length: number,
  mode: 'min' | 'max' = 'min',
  allowed: (index: number) => boolean = () => true,
): TimeWindow | null {
  let best: TimeWindow | null = null;
  for (let index = 0; index + length <= series.length; index += 1) {
    let sum = 0;
    let valid = true;
    for (let offset = 0; offset < length; offset += 1) {
      const value = series[index + offset];
      if (value === undefined || !allowed(index + offset)) {
        valid = false;
        break;
      }
      sum += value;
    }
    if (!valid) continue;
    const average = sum / length;
    const better =
      best === null || (mode === 'min' ? average < best.average : average > best.average);
    if (better) best = { index, length, average };
  }
  return best;
}

/** Index of the hourly point that contains the snapshot's current reading. */
export function currentIndex(snapshot: AirSnapshot): number {
  const prefix = snapshot.current.time.slice(0, 13);
  const found = snapshot.hourly.findIndex((point) => point.time.startsWith(prefix));
  return found === -1 ? 0 : found;
}

export interface Outlook {
  hours: HourPoint[];
  cleanest: TimeWindow | null;
  dirtiest: TimeWindow | null;
  ventilate: TimeWindow | null;
  exercise: TimeWindow | null;
}

/** Next `span` hours from now with the windows a family can act on. */
export function outlook(snapshot: AirSnapshot, span = 24): Outlook {
  const start = currentIndex(snapshot);
  const hours = snapshot.hourly.slice(start, start + span);
  const pm = hours.map((h) => h.pm2_5);
  const awake = (i: number) => {
    const point = hours[i];
    if (!point) return false;
    const hour = hourOf(point);
    return hour >= AWAKE_HOURS.from && hour < AWAKE_HOURS.to;
  };
  const exerciseOk = (i: number) => {
    const point = hours[i];
    return point !== undefined && awake(i) && hourOf(point) <= 19;
  };
  return {
    hours,
    cleanest: extremeWindow(pm, 3, 'min'),
    dirtiest: extremeWindow(pm, 3, 'max'),
    ventilate: extremeWindow(pm, 1, 'min', awake),
    exercise: extremeWindow(pm, 1, 'min', exerciseOk),
  };
}

/** The 24 PM2.5 values (index = local hour) for day 0 (today) or 1 (tomorrow). */
export function dayPm25(snapshot: AirSnapshot, day: 0 | 1): number[] {
  const slice = snapshot.hourly.slice(day * 24, day * 24 + 24).map((h) => h.pm2_5);
  if (slice.length === 24) return slice;
  const fallback = slice.length > 0 ? slice : [snapshot.current.pm2_5];
  return Array.from({ length: 24 }, (_, i) => fallback[i % fallback.length] ?? 0);
}

export const formatHour = (hour: number): string => {
  const total = ((Math.round(hour * 60) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return minutes === 0
    ? `${display} ${suffix}`
    : `${display}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export const pointHour = hourOf;
