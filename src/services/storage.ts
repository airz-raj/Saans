/**
 * Local persistence. Everything about the household stays on this device; stored data is
 * re-validated on load so a corrupted or tampered entry can never break the app.
 */
import { MODES } from '../core/constants';
import { DEFAULT_PROFILE } from '../core/defaults';
import type { Activity, MaskType, Profile, RoomSetup } from '../core/types';

export const STORAGE_KEYS = { profile: 'saans.profile.v1', plan: 'saans.plan.v1' } as const;

export function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or disabled (private mode); the app keeps working in memory.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);

const MODE_KEYS = Object.keys(MODES) as (keyof typeof MODES)[];

function sanitiseRoom(raw: unknown): RoomSetup {
  const d = DEFAULT_PROFILE.room;
  const r = isRecord(raw) ? raw : {};
  return {
    areaM2: num(r.areaM2, d.areaM2, 4, 200),
    ceilingM: num(r.ceilingM, d.ceilingM, 2, 6),
    windows: oneOf(r.windows, ['open', 'closed', 'sealed'], d.windows),
    purifierCadr: num(r.purifierCadr, d.purifierCadr, 0, 2000),
    cookingFuel: oneOf(r.cookingFuel, ['induction', 'lpg', 'biomass', 'none'], d.cookingFuel),
    kitchenExhaust: bool(r.kitchenExhaust, d.kitchenExhaust),
    incense: bool(r.incense, d.incense),
    mosquitoCoil: bool(r.mosquitoCoil, d.mosquitoCoil),
    smoking: bool(r.smoking, d.smoking),
  };
}

export function sanitiseProfile(raw: unknown): Profile {
  const d = DEFAULT_PROFILE;
  const p = isRecord(raw) ? raw : {};
  const place =
    isRecord(p.place) && typeof p.place.lat === 'number' && typeof p.place.lon === 'number'
      ? {
          name: text(p.place.name, 80) ?? 'My location',
          lat: num(p.place.lat, 0, -90, 90),
          lon: num(p.place.lon, 0, -180, 180),
          admin: text(p.place.admin, 80),
          country: text(p.place.country, 80),
        }
      : null;
  return {
    place,
    persona: oneOf(p.persona, ['adult', 'child', 'older'], d.persona),
    children: Math.round(num(p.children, d.children, 0, 10)),
    elders: Math.round(num(p.elders, d.elders, 0, 10)),
    sensitiveMember: bool(p.sensitiveMember, d.sensitiveMember),
    commuteMode: oneOf(p.commuteMode, [...MODE_KEYS, 'none'], d.commuteMode),
    commuteKm: num(p.commuteKm, d.commuteKm, 0, 80),
    departHour: num(p.departHour, d.departHour, 4, 13),
    returnHour: num(p.returnHour, d.returnHour, 12, 23),
    exerciseHour: p.exerciseHour === null ? null : num(p.exerciseHour, d.exerciseHour ?? 7, 5, 21),
    exerciseMinutes: num(p.exerciseMinutes, d.exerciseMinutes, 0, 180),
    exerciseSetting: oneOf(
      p.exerciseSetting,
      ['outdoor-roadside', 'outdoor-green', 'home'],
      d.exerciseSetting,
    ),
    room: sanitiseRoom(p.room),
    language: oneOf(p.language, ['en', 'hi'], d.language),
  };
}

const KINDS = ['sleep', 'home', 'cooking', 'commute', 'work', 'exercise', 'errand'] as const;
const SETTINGS = [
  'home',
  'office',
  'school',
  'outdoor-roadside',
  'outdoor-green',
  'transit',
] as const;
const EFFORTS = ['sleep', 'rest', 'light', 'moderate', 'vigorous'] as const;

export function sanitisePlan(raw: unknown): Activity[] | null {
  if (!Array.isArray(raw)) return null;
  const plan = raw
    .filter(isRecord)
    .slice(0, 30)
    .map((a): Activity | null => {
      const id = text(a.id, 40);
      const label = text(a.label, 60);
      if (!id || !label) return null;
      const mode = MODE_KEYS.includes(a.mode as never) ? (a.mode as Activity['mode']) : undefined;
      return {
        id,
        label,
        kind: oneOf(a.kind, KINDS, 'home'),
        start: num(a.start, 0, 0, 23.75),
        duration: num(a.duration, 1, 0.25, 12),
        setting: oneOf(a.setting, SETTINGS, 'home'),
        effort: oneOf(a.effort, EFFORTS, 'rest'),
        ...(mode ? { mode, distanceKm: num(a.distanceKm, 5, 0, 80) } : {}),
        ...(a.mask
          ? { mask: oneOf<MaskType>(a.mask, ['none', 'cloth', 'surgical', 'n95'], 'none') }
          : {}),
        ...(a.extraCadr ? { extraCadr: num(a.extraCadr, 0, 0, 2000) } : {}),
      };
    });
  return plan.every((a) => a !== null) ? plan : null;
}
