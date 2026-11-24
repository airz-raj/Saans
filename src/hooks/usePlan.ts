import { useCallback, useMemo } from 'react';
import { applySwap } from '../core/optimizer';
import { buildDefaultPlan } from '../core/plan';
import type { Activity, Profile, Swap } from '../core/types';
import { readStored, sanitisePlan, sanitiseProfile, STORAGE_KEYS } from '../services/storage';
import { usePersistentState } from './usePersistentState';

export interface PlanActions {
  apply: (swap: Swap) => void;
  remove: (id: string) => void;
  add: (activity: Activity) => void;
  rebuild: () => void;
}

const byStart = (a: Activity, b: Activity): number => a.start - b.start;

/** A saved plan, or the household's default day if nothing valid is stored yet. */
const loadPlan = (stored: unknown): Activity[] =>
  sanitisePlan(stored) ?? buildDefaultPlan(sanitiseProfile(readStored(STORAGE_KEYS.profile)));

/** The household's day plan, persisted locally, with the edits the Breath Budget offers. */
export function usePlan(profile: Profile): [Activity[], PlanActions] {
  const [plan, setPlan] = usePersistentState<Activity[]>(STORAGE_KEYS.plan, loadPlan);

  const apply = useCallback(
    (swap: Swap) => setPlan((current) => applySwap(current, swap)),
    [setPlan],
  );
  const remove = useCallback(
    (id: string) => setPlan((current) => current.filter((a) => a.id !== id)),
    [setPlan],
  );
  const add = useCallback(
    (activity: Activity) => setPlan((current) => [...current, activity].sort(byStart)),
    [setPlan],
  );
  const rebuild = useCallback(() => setPlan(buildDefaultPlan(profile)), [setPlan, profile]);

  const actions = useMemo(() => ({ apply, remove, add, rebuild }), [apply, remove, add, rebuild]);
  return [plan, actions];
}
