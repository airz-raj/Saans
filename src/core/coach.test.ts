import { computeAqi } from './aqi';
import { buildCoachContext, fallbackAdvisory, fallbackAnswer, fallbackPlan } from './coach';
import { DEFAULT_PROFILE } from './defaults';
import { dayBudget } from './exposure';
import { dayPm25 } from './forecast';
import { rankHomeHacks } from './indoor';
import { suggestSwaps } from './optimizer';
import { buildDefaultPlan } from './plan';
import { sampleSnapshot } from './sampleAir';

const snapshot = sampleSnapshot(new Date(2026, 10, 23, 8));
const ctx = { pm25: dayPm25(snapshot, 0), room: DEFAULT_PROFILE.room, persona: 'adult' as const };
const plan = buildDefaultPlan(DEFAULT_PROFILE);

const context = buildCoachContext({
  placeName: 'X'.repeat(200),
  aqi: computeAqi(snapshot.current),
  pm25Now: snapshot.current.pm2_5,
  cleanWindow: '1 PM–4 PM',
  worstWindow: '5 AM–8 AM',
  profile: { ...DEFAULT_PROFILE, sensitiveMember: true },
  budget: dayBudget(plan, ctx),
  swaps: suggestSwaps(plan, ctx),
  hacks: rankHomeHacks(DEFAULT_PROFILE.room, 250, 'evening'),
});

describe('buildCoachContext', () => {
  it('bounds and rounds everything sent to the model', () => {
    expect(context.place).toHaveLength(80);
    expect(context.budget.top.length).toBeLessThanOrEqual(4);
    expect(context.swaps.length).toBeLessThanOrEqual(5);
    expect(Number.isInteger(context.budget.totalDoseUg)).toBe(true);
    expect(context.dominant).toBe('PM2.5');
  });
});

describe('fallbacks', () => {
  it('builds a usable plan without the model', () => {
    const plan = fallbackPlan(context);
    expect(plan.headline).toContain(`AQI ${context.aqi}`);
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.caution).toMatch(/asthma/);
  });

  it('answers with the computed facts', () => {
    expect(fallbackAnswer(context).answer).toContain('1 PM–4 PM');
  });

  it('writes advisories in English and Hindi', () => {
    expect(fallbackAdvisory(context, 'en').message).toMatch(/don't burn/);
    expect(fallbackAdvisory(context, 'hi').message).toMatch(/खिड़कियाँ/);
  });

  it('omits empty sections gracefully', () => {
    const bare = {
      ...context,
      cleanWindow: null,
      swaps: [],
      hacks: [],
      household: { ...context.household, children: 0, elders: 0, sensitiveMember: false },
    };
    expect(fallbackPlan(bare).steps).toEqual([]);
    expect(fallbackPlan(bare).caution).toBe('Estimates for planning, not medical advice.');
  });
});
