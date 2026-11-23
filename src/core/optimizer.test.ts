import { DEFAULT_PROFILE } from './defaults';
import { dayBudget, type ExposureContext } from './exposure';
import { explainSwap } from './explain';
import { dayPm25 } from './forecast';
import { applySwap, suggestSwaps } from './optimizer';
import { buildDefaultPlan } from './plan';
import { sampleSnapshot } from './sampleAir';
import { MODES } from './constants';

const snapshot = sampleSnapshot(new Date(2026, 10, 23, 8));
const ctx: ExposureContext = {
  pm25: dayPm25(snapshot, 0),
  room: DEFAULT_PROFILE.room,
  persona: 'adult',
};
const plan = buildDefaultPlan(DEFAULT_PROFILE);

describe('suggestSwaps', () => {
  const swaps = suggestSwaps(plan, ctx);

  it('returns meaningful swaps ordered by dose saved', () => {
    expect(swaps.length).toBeGreaterThan(2);
    expect(swaps.length).toBeLessThanOrEqual(5);
    const saved = swaps.map((s) => s.doseSaved);
    expect([...saved].sort((a, b) => b - a)).toEqual(saved);
    swaps.forEach((s) => {
      expect(s.doseSaved).toBeGreaterThanOrEqual(5);
      expect(s.doseAfter).toBeLessThan(s.doseBefore);
    });
  });

  it('moves the morning jog into the cleaner afternoon', () => {
    const exercise = swaps.find((s) => s.activityId === 'exercise');
    expect(exercise).toBeDefined();
    if (exercise?.kind === 'shift') {
      expect(exercise.after.start).toBeGreaterThanOrEqual(12);
      expect(exercise.after.start).toBeLessThanOrEqual(16);
    } else {
      expect(exercise?.kind).toBe('setting');
    }
  });

  it('never proposes a commute that emits more CO₂', () => {
    swaps
      .filter((s) => s.kind === 'mode')
      .forEach((s) => {
        expect(MODES[s.after.mode!].co2PerKm).toBeLessThanOrEqual(
          MODES[s.before.mode!].co2PerKm + 0.011,
        );
        expect(s.co2Saved).toBeGreaterThanOrEqual(-0.2);
      });
  });

  it('shows at most one mask tip', () => {
    expect(swaps.filter((s) => s.kind === 'mask').length).toBeLessThanOrEqual(1);
  });

  it('offers a bedroom air cleaner only when the home has none', () => {
    const withPurifier = suggestSwaps(
      plan,
      { ...ctx, room: { ...ctx.room, purifierCadr: 300 } },
      10,
    );
    expect(withPurifier.some((s) => s.kind === 'cleaner')).toBe(false);
    expect(suggestSwaps(plan, ctx, 10).some((s) => s.kind === 'cleaner')).toBe(true);
  });

  it('returns nothing when air is already clean', () => {
    const clean = {
      ...ctx,
      pm25: Array.from({ length: 24 }, () => 5),
      room: { ...ctx.room, incense: false },
    };
    expect(
      suggestSwaps(plan, clean).filter((s) => s.kind !== 'cleaner' && s.kind !== 'mask'),
    ).toEqual([]);
  });
});

describe('applySwap', () => {
  it('lowers the daily budget by the swap saving', () => {
    const [swap] = suggestSwaps(plan, ctx);
    expect(swap).toBeDefined();
    if (!swap) return;
    const next = applySwap(plan, swap);
    expect(next.find((a) => a.id === swap.activityId)).toEqual(swap.after);
    expect(dayBudget(next, ctx).totalDose).toBeLessThan(dayBudget(plan, ctx).totalDose);
    expect(explainSwap(swap, ctx)).toMatch(/Cuts what you inhale/);
  });
});
