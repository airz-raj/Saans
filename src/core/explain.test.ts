import { DEFAULT_PROFILE } from './defaults';
import {
  aqiAdvice,
  budgetHeadline,
  dominantText,
  explainSwap,
  formatConc,
  formatDose,
  MYTHS,
  percent,
} from './explain';
import { dayBudget } from './exposure';
import { buildDefaultPlan } from './plan';

describe('formatting', () => {
  it.each([
    [0.4, '<1 µg'],
    [12.4, '12 µg'],
    [1530, '1.5 mg'],
  ])('formats %d µg as %s', (value, text) => {
    expect(formatDose(value)).toBe(text);
  });

  it('formats concentrations and percentages safely', () => {
    expect(formatConc(12.6)).toBe('13 µg/m³');
    expect(percent(1, 4)).toBe(25);
    expect(percent(1, 0)).toBe(0);
  });
});

describe('advice', () => {
  it('escalates with category', () => {
    expect(aqiAdvice('Severe').general).toMatch(/Stay indoors/);
    expect(aqiAdvice('Good').sensitive).toMatch(/No special/);
    expect(dominantText('pm2_5')).toContain('PM2.5');
  });

  it('names the biggest contributor to the day', () => {
    const budget = dayBudget(buildDefaultPlan(DEFAULT_PROFILE), {
      pm25: Array.from({ length: 24 }, () => 200),
      room: DEFAULT_PROFILE.room,
      persona: 'adult',
    });
    expect(budgetHeadline(budget)).toMatch(/% of today's dose/);
    expect(budgetHeadline({ ...budget, items: [] })).toMatch(/Add activities/);
  });

  it('ships myth-busters', () => {
    expect(MYTHS.length).toBeGreaterThanOrEqual(3);
  });
});

describe('explainSwap wording', () => {
  const ctx = {
    pm25: Array.from({ length: 24 }, () => 100),
    room: DEFAULT_PROFILE.room,
    persona: 'adult' as const,
  };
  const commute = {
    id: 'c',
    label: 'Commute',
    kind: 'commute' as const,
    start: 9,
    duration: 0.5,
    setting: 'transit' as const,
    effort: 'rest' as const,
    mode: 'bus' as const,
    distanceKm: 8,
  };
  const base = {
    id: 's',
    activityId: 'c',
    title: 't',
    before: commute,
    doseBefore: 100,
    doseAfter: 50,
    doseSaved: 50,
  };

  it('covers mode swaps with and without emission or time changes', () => {
    const same = explainSwap(
      { ...base, kind: 'mode', after: { ...commute, mode: 'metro' }, co2Saved: 0, minutesDelta: 0 },
      ctx,
    );
    expect(same).toMatch(/Emissions stay about the same/);
    expect(same).not.toMatch(/Travel time/);
    const faster = explainSwap(
      {
        ...base,
        kind: 'mode',
        after: { ...commute, mode: undefined },
        co2Saved: 0.1,
        minutesDelta: -5,
      },
      ctx,
    );
    expect(faster).toMatch(/new mode/);
    expect(faster).toMatch(/Travel time changes by -5 min/);
  });

  it('explains setting, mask and cleaner swaps', () => {
    const park = explainSwap(
      {
        ...base,
        kind: 'setting',
        after: { ...commute, setting: 'outdoor-green' },
        co2Saved: 0,
        minutesDelta: 0,
      },
      ctx,
    );
    expect(park).toMatch(/distance from traffic/);
    const home = explainSwap(
      {
        ...base,
        kind: 'setting',
        after: { ...commute, setting: 'home' },
        co2Saved: 0,
        minutesDelta: 0,
      },
      ctx,
    );
    expect(home).toMatch(/Indoors the air is filtered/);
    expect(
      explainSwap({ ...base, kind: 'mask', after: commute, co2Saved: 0, minutesDelta: 0 }, ctx),
    ).toMatch(/N95/);
    expect(
      explainSwap({ ...base, kind: 'cleaner', after: commute, co2Saved: 0, minutesDelta: 0 }, ctx),
    ).toMatch(/asleep/);
  });
});
