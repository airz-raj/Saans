import { DEFAULT_PROFILE } from '../core/defaults';
import { buildDefaultPlan } from '../core/plan';
import { readStored, sanitisePlan, sanitiseProfile, writeStored } from './storage';

describe('sanitiseProfile', () => {
  it('returns defaults for missing or malformed data', () => {
    expect(sanitiseProfile(undefined)).toEqual(DEFAULT_PROFILE);
    expect(sanitiseProfile('nonsense')).toEqual(DEFAULT_PROFILE);
    expect(sanitiseProfile([1, 2])).toEqual(DEFAULT_PROFILE);
  });

  it('clamps numbers and rejects unknown enum values', () => {
    const profile = sanitiseProfile({
      persona: 'alien',
      children: 99,
      commuteMode: 'rocket',
      commuteKm: -4,
      exerciseHour: null,
      room: { areaM2: 1e9, windows: 'broken', purifierCadr: 'lots', incense: 'yes' },
      language: 'hi',
    });
    expect(profile.persona).toBe('adult');
    expect(profile.children).toBe(10);
    expect(profile.commuteMode).toBe(DEFAULT_PROFILE.commuteMode);
    expect(profile.commuteKm).toBe(0);
    expect(profile.exerciseHour).toBeNull();
    expect(profile.room.areaM2).toBe(200);
    expect(profile.room.windows).toBe('closed');
    expect(profile.room.purifierCadr).toBe(0);
    expect(profile.room.incense).toBe(DEFAULT_PROFILE.room.incense);
    expect(profile.language).toBe('hi');
  });

  it('keeps a valid place and trims long names', () => {
    const profile = sanitiseProfile({ place: { name: 'x'.repeat(200), lat: 28.5, lon: 77.1 } });
    expect(profile.place?.name).toHaveLength(80);
    expect(sanitiseProfile({ place: { name: 'A', lat: '28' } }).place).toBeNull();
  });
});

describe('sanitisePlan', () => {
  it('round-trips a real plan', () => {
    const plan = buildDefaultPlan(DEFAULT_PROFILE);
    expect(sanitisePlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
  });

  it('rejects anything that is not a list of labelled activities', () => {
    expect(sanitisePlan({})).toBeNull();
    expect(sanitisePlan([{ id: 'a' }])).toBeNull();
  });

  it('clamps times and drops unknown modes', () => {
    const [activity] =
      sanitisePlan([
        { id: 'a', label: 'A', start: 40, duration: 0, mode: 'jet', mask: 'gas', extraCadr: 9999 },
      ]) ?? [];
    expect(activity).toMatchObject({
      start: 23.75,
      duration: 0.25,
      kind: 'home',
      mask: 'none',
      extraCadr: 2000,
    });
    expect(activity?.mode).toBeUndefined();
  });
});

describe('storage helpers', () => {
  it('survives corrupt JSON and storage errors', () => {
    localStorage.setItem('bad', '{oops');
    expect(readStored('bad')).toBeUndefined();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeStored('k', 1)).not.toThrow();
    spy.mockRestore();
    writeStored('k', { a: 1 });
    expect(readStored('k')).toEqual({ a: 1 });
  });
});
