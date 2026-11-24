import {
  coachAdvisorySchema,
  coachContextSchema,
  coachPlanSchema,
  coachRequestSchema,
} from '../../shared/coachContract';
import { buildPrompt } from '../../api/_lib/prompt';
import { coachContext } from './fixtures';

describe('coach contract', () => {
  it('accepts the context the browser builds and defaults a missing forecast', () => {
    const { forecast: _omit, ...withoutForecast } = coachContext;
    const parsed = coachContextSchema.parse(withoutForecast);
    expect(parsed.forecast).toEqual([]);
  });

  it.each([
    [
      'too many forecast hours',
      { forecast: Array.from({ length: 25 }, () => ({ time: '1 PM', pm25: 1 })) },
    ],
    ['unknown persona', { household: { ...coachContext.household, persona: 'robot' } }],
    ['negative AQI', { aqi: -1 }],
    ['oversized place', { place: 'x'.repeat(81) }],
  ])('rejects %s', (_name, patch) => {
    expect(coachContextSchema.safeParse({ ...coachContext, ...patch }).success).toBe(false);
  });

  it('requires a question only in ask mode', () => {
    const base = { language: 'en', context: coachContext };
    expect(coachRequestSchema.safeParse({ ...base, mode: 'plan' }).success).toBe(true);
    expect(coachRequestSchema.safeParse({ ...base, mode: 'ask', question: 'hi' }).success).toBe(
      false,
    );
    expect(
      coachRequestSchema.safeParse({ ...base, mode: 'ask', question: 'Is 5 PM ok?' }).success,
    ).toBe(true);
  });

  it('bounds what the model may return', () => {
    expect(coachPlanSchema.safeParse({ headline: 'h', steps: [], caution: 'c' }).success).toBe(
      false,
    );
    expect(coachAdvisorySchema.safeParse({ title: 't', message: 'm'.repeat(1201) }).success).toBe(
      false,
    );
  });
});

describe('buildPrompt', () => {
  const context = coachContextSchema.parse(coachContext);

  it.each(['plan', 'community'] as const)('includes language, context and task for %s', (mode) => {
    const prompt = buildPrompt({ mode, language: 'en', context });
    expect(prompt).toContain('LANGUAGE: English');
    expect(prompt).toContain('"place":"New Delhi"');
    expect(prompt).toContain('TASK:');
    expect(prompt).not.toContain('<user_question>');
  });

  it('carries the forecast so the model can reason about times', () => {
    expect(
      buildPrompt({ mode: 'ask', language: 'en', question: 'When to walk?', context }),
    ).toContain('"forecast":[{"time":"5 PM","pm25":160}');
  });
});
