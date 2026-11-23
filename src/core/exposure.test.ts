import { DEFAULT_ROOM } from './defaults';
import {
  activityConcentration,
  activityDose,
  dayBudget,
  fillGaps,
  occupiedSlots,
  overlaps,
  windowAverage,
  type ExposureContext,
} from './exposure';
import { indoorConcentration } from './indoor';
import type { Activity, RoomSetup } from './types';

const room: RoomSetup = { ...DEFAULT_ROOM, incense: false, smoking: false, mosquitoCoil: false };
const flat = (value: number) => Array.from({ length: 24 }, () => value);
const ctx = (pm: number[] = flat(100)): ExposureContext => ({ pm25: pm, room, persona: 'adult' });

const jog: Activity = {
  id: 'jog',
  label: 'Jog',
  kind: 'exercise',
  start: 7,
  duration: 1,
  setting: 'outdoor-roadside',
  effort: 'moderate',
};

describe('windowAverage', () => {
  it('averages across the hours an activity spans', () => {
    const series = flat(0).map((_, h) => h * 10);
    expect(windowAverage(series, 2, 2)).toBe(25);
  });

  it('wraps past midnight', () => {
    const series = flat(0);
    series[23] = 100;
    series[0] = 200;
    expect(windowAverage(series, 23, 2)).toBe(150);
  });

  it('handles empty input', () => {
    expect(windowAverage([], 0, 2)).toBe(0);
    expect(windowAverage(flat(5), 0, 0)).toBe(0);
  });
});

describe('activityDose', () => {
  it('multiplies concentration, breathing rate and time', () => {
    const result = activityDose(jog, ctx());
    expect(result.concentration).toBeCloseTo(125); // roadside factor 1.25
    expect(result.volume).toBeCloseTo(1.5);
    expect(result.dose).toBeCloseTo(187.5);
  });

  it('reduces dose with an N95 and for children', () => {
    const base = activityDose(jog, ctx()).dose;
    expect(activityDose({ ...jog, mask: 'n95' }, ctx()).dose).toBeCloseTo(base * 0.3);
    expect(activityDose(jog, { ...ctx(), persona: 'child' }).dose).toBeCloseTo(base * 0.65);
  });

  it('uses the indoor model at home and mode factors in transit', () => {
    const home: Activity = { ...jog, setting: 'home', kind: 'home' };
    expect(activityConcentration(home, ctx())).toBeCloseTo(indoorConcentration(room, 100));
    const metro: Activity = { ...jog, setting: 'transit', kind: 'commute', mode: 'metro' };
    expect(activityConcentration(metro, ctx())).toBeCloseTo(75);
    const office: Activity = { ...jog, setting: 'office', kind: 'work', mask: 'n95' };
    expect(activityConcentration(office, ctx())).toBeCloseTo(60); // masks ignored indoors
  });
});

describe('slots and gaps', () => {
  it('wraps occupied slots past midnight', () => {
    const slots = occupiedSlots({ start: 23.5, duration: 1 });
    expect(slots).toEqual([94, 95, 0, 1]);
  });

  it('detects overlaps', () => {
    expect(overlaps({ start: 7.5, duration: 1 }, [jog])).toBe(true);
    expect(overlaps({ start: 8, duration: 1 }, [jog])).toBe(false);
  });

  it('fills the rest of the day with time at home', () => {
    const filled = fillGaps([jog]);
    const hours = filled.reduce((sum, a) => sum + a.duration, 0);
    expect(hours).toBe(24);
    expect(filled.filter((a) => a.label === 'At home')).toHaveLength(2);
  });
});

describe('dayBudget', () => {
  it('covers 24 h and converts exposure to cigarettes and WHO multiples', () => {
    const budget = dayBudget([], ctx(flat(22)));
    const indoor = indoorConcentration(room, 22);
    expect(budget.items.reduce((s, i) => s + i.activity.duration, 0)).toBe(24);
    expect(budget.exposureAvg).toBeCloseTo(indoor);
    expect(budget.cigarettes).toBeCloseTo(indoor / 22);
    expect(budget.whoMultiple).toBeCloseTo(indoor / 15);
  });

  it('makes an outdoor jog a disproportionate share of the dose', () => {
    const budget = dayBudget([jog], ctx(flat(250)));
    const jogItem = budget.items.find((i) => i.activity.id === 'jog');
    expect(jogItem).toBeDefined();
    expect((jogItem?.dose ?? 0) / budget.totalDose).toBeGreaterThan((1 / 24) * 3);
  });
});
