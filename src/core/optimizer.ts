import { AWAKE_HOURS, INDOOR, MODES, SWAP_THRESHOLD } from './constants';
import { activityDose, FILLER_PREFIX, overlaps, type ExposureContext } from './exposure';
import { formatHour } from './forecast';
import { travelHours } from './plan';
import type { Activity, Swap, SwapKind, TransportMode } from './types';

interface Candidate {
  kind: SwapKind;
  title: string;
  after: Activity;
}

const isOutdoorOrTransit = (a: Activity) =>
  a.setting === 'transit' || a.setting === 'outdoor-roadside' || a.setting === 'outdoor-green';

function shiftCandidates(activity: Activity, others: readonly Activity[]): Candidate[] {
  if (activity.kind !== 'exercise' && activity.kind !== 'errand') return [];
  const result: Candidate[] = [];
  for (let hour = AWAKE_HOURS.from; hour + activity.duration <= AWAKE_HOURS.to; hour += 1) {
    if (hour === activity.start) continue;
    const after = { ...activity, start: hour };
    if (overlaps(after, others)) continue;
    result.push({ kind: 'shift', title: `Move “${activity.label}” to ${formatHour(hour)}`, after });
  }
  return result;
}

function settingCandidates(activity: Activity): Candidate[] {
  if (activity.kind !== 'exercise') return [];
  const result: Candidate[] = [];
  if (activity.setting === 'outdoor-roadside') {
    result.push({
      kind: 'setting',
      title: `Do “${activity.label}” in a park, away from traffic`,
      after: { ...activity, setting: 'outdoor-green' },
    });
  }
  if (activity.setting !== 'home') {
    result.push({
      kind: 'setting',
      title: 'Swap the outdoor session for an indoor workout',
      after: { ...activity, setting: 'home', label: 'Home workout' },
    });
  }
  return result;
}

function modeCandidates(activity: Activity): Candidate[] {
  if (activity.kind !== 'commute' || !activity.mode || !activity.distanceKm) return [];
  const current = MODES[activity.mode];
  const km = activity.distanceKm;
  return (
    (Object.keys(MODES) as TransportMode[])
      .filter((mode) => mode !== activity.mode && km <= MODES[mode].maxKm)
      // Low-emission routines only: never recommend a mode that emits meaningfully more CO₂.
      .filter((mode) => MODES[mode].co2PerKm <= current.co2PerKm + 0.011)
      .map((mode) => ({
        kind: 'mode' as const,
        title: `Take the ${MODES[mode].label.toLowerCase()} for “${activity.label}”`,
        after: {
          ...activity,
          mode,
          effort: MODES[mode].effort,
          duration: travelHours(mode, km),
        },
      }))
  );
}

function protectionCandidates(activity: Activity, ctx: ExposureContext): Candidate[] {
  const result: Candidate[] = [];
  // Masks make hard breathing uncomfortable, so exercise is fixed by timing and place instead.
  if (isOutdoorOrTransit(activity) && activity.kind !== 'exercise' && activity.mask !== 'n95') {
    result.push({
      kind: 'mask',
      title: `Wear a well-fitted N95 for “${activity.label}”`,
      after: { ...activity, mask: 'n95' },
    });
  }
  if (activity.kind === 'sleep' && ctx.room.purifierCadr === 0 && !activity.extraCadr) {
    result.push({
      kind: 'cleaner',
      title: 'Run a box-fan filter in the bedroom while you sleep',
      after: { ...activity, extraCadr: INDOOR.diyFilterCadr },
    });
  }
  return result;
}

function co2Saved(before: Activity, after: Activity): number {
  if (!before.mode || !after.mode || !before.distanceKm) return 0;
  return (MODES[before.mode].co2PerKm - MODES[after.mode].co2PerKm) * before.distanceKm;
}

function toSwap(before: Activity, candidate: Candidate, ctx: ExposureContext): Swap {
  const doseBefore = activityDose(before, ctx).dose;
  const doseAfter = activityDose(candidate.after, ctx).dose;
  return {
    id: `${before.id}:${candidate.kind}:${candidate.after.start}:${candidate.after.mode ?? ''}:${candidate.after.setting}`,
    kind: candidate.kind,
    activityId: before.id,
    title: candidate.title,
    before,
    after: candidate.after,
    doseBefore,
    doseAfter,
    doseSaved: doseBefore - doseAfter,
    co2Saved: co2Saved(before, candidate.after),
    minutesDelta: Math.round((candidate.after.duration - before.duration) * 60),
  };
}

const worthShowing = (swap: Swap) =>
  swap.doseSaved >= SWAP_THRESHOLD.minMicrograms &&
  swap.doseSaved >= swap.doseBefore * SWAP_THRESHOLD.minFraction;

/**
 * Proposes the most effective changes to the day. Each activity contributes at most one
 * routine change (shift / mode / setting) plus protection options; at most one mask tip
 * is shown so the list stays about routines, not equipment.
 */
export function suggestSwaps(
  activities: readonly Activity[],
  ctx: ExposureContext,
  limit = 5,
): Swap[] {
  const planned = activities.filter((a) => !a.id.startsWith(FILLER_PREFIX));
  const routine: Swap[] = [];
  const protection: Swap[] = [];

  for (const activity of planned) {
    const others = planned.filter((a) => a.id !== activity.id);
    const best = [
      ...shiftCandidates(activity, others),
      ...settingCandidates(activity),
      ...modeCandidates(activity),
    ]
      .map((candidate) => toSwap(activity, candidate, ctx))
      .filter(worthShowing)
      .sort((a, b) => b.doseSaved - a.doseSaved)[0];
    if (best) routine.push(best);
    protection.push(
      ...protectionCandidates(activity, ctx)
        .map((candidate) => toSwap(activity, candidate, ctx))
        .filter(worthShowing),
    );
  }

  const bestMask = protection
    .filter((s) => s.kind === 'mask')
    .sort((a, b) => b.doseSaved - a.doseSaved)[0];
  const cleaners = protection.filter((s) => s.kind === 'cleaner');
  return [...routine, ...cleaners, ...(bestMask ? [bestMask] : [])]
    .sort((a, b) => b.doseSaved - a.doseSaved)
    .slice(0, limit);
}

export function applySwap(activities: readonly Activity[], swap: Swap): Activity[] {
  return activities
    .map((activity) => (activity.id === swap.activityId ? swap.after : activity))
    .sort((a, b) => a.start - b.start);
}
