import { DEFAULT_PROFILE } from './defaults';
import {
  aqiAdvice,
  budgetHeadline,
  dominantText,
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
