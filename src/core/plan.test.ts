import { DEFAULT_PROFILE } from './defaults';
import { overlaps } from './exposure';
import { buildDefaultPlan, quarter, travelHours } from './plan';

describe('buildDefaultPlan', () => {
  it('builds a non-overlapping day from the profile', () => {
    const plan = buildDefaultPlan(DEFAULT_PROFILE);
    expect(plan.map((a) => a.id)).toEqual(
      expect.arrayContaining([
        'sleep',
        'commute-out',
        'day',
        'commute-back',
        'exercise',
        'cooking',
        'errand',
      ]),
    );
    plan.forEach((activity) =>
      expect(
        overlaps(
          activity,
          plan.filter((a) => a.id !== activity.id),
        ),
      ).toBe(false),
    );
  });

  it('is sorted by start time', () => {
    const starts = buildDefaultPlan(DEFAULT_PROFILE).map((a) => a.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('skips the commute for households who do not travel', () => {
    const plan = buildDefaultPlan({ ...DEFAULT_PROFILE, commuteMode: 'none' });
    expect(plan.some((a) => a.kind === 'commute' || a.kind === 'work')).toBe(false);
  });

  it('adapts the day for a child', () => {
    const plan = buildDefaultPlan({ ...DEFAULT_PROFILE, persona: 'child' });
    expect(plan.find((a) => a.id === 'day')?.setting).toBe('school');
    expect(plan.find((a) => a.id === 'sleep')?.duration).toBe(9);
  });

  it('models indoor exercise and no cooking when chosen', () => {
    const plan = buildDefaultPlan({
      ...DEFAULT_PROFILE,
      exerciseSetting: 'home',
      room: { ...DEFAULT_PROFILE.room, cookingFuel: 'none' },
    });
    expect(plan.find((a) => a.id === 'exercise')?.setting).toBe('home');
    expect(plan.some((a) => a.id === 'cooking')).toBe(false);
  });
});

describe('time helpers', () => {
  it('rounds to quarter hours and never returns a zero-length trip', () => {
    expect(quarter(7.1)).toBe(7);
    expect(quarter(7.2)).toBe(7.25);
    expect(travelHours('metro', 0.5)).toBe(0.25);
    expect(travelHours('bus', 8)).toBe(0.5);
  });
});
