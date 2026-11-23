import { z } from 'zod';

/** Coordinates are rounded to ~1 km: enough for city air data, kinder to privacy and caches. */
const coordinate = (min: number, max: number) =>
  z.coerce
    .number()
    .finite()
    .min(min)
    .max(max)
    .transform((value) => Math.round(value * 100) / 100);

export const airQuery = z.object({ lat: coordinate(-90, 90), lon: coordinate(-180, 180) });

export const geocodeQuery = z.object({
  q: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[\p{L}\p{M}\s.,'-]+$/u, 'Only letters, spaces and basic punctuation'),
});

const shortText = (max: number) => z.string().trim().max(max);
const count = z.number().int().min(0).max(20);

export const coachContext = z.object({
  place: shortText(80),
  aqi: z.number().min(0).max(500),
  category: z.enum(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe']),
  dominant: shortText(10),
  pm25Now: z.number().min(0).max(2000),
  cleanWindow: shortText(40).nullable(),
  worstWindow: shortText(40).nullable(),
  household: z.object({
    persona: z.enum(['adult', 'child', 'older']),
    children: count,
    elders: count,
    sensitiveMember: z.boolean(),
  }),
  budget: z.object({
    totalDoseUg: z.number().min(0).max(1_000_000),
    cigarettes: z.number().min(0).max(1000),
    whoMultiple: z.number().min(0).max(1000),
    top: z
      .array(
        z.object({
          label: shortText(60),
          doseUg: z.number().min(0).max(1_000_000),
          sharePct: z.number().min(0).max(100),
        }),
      )
      .max(4),
  }),
  swaps: z
    .array(
      z.object({
        title: shortText(120),
        savedPct: z.number().min(0).max(100),
        co2SavedKg: z.number().min(-100).max(100),
      }),
    )
    .max(5),
  hacks: z
    .array(
      z.object({
        title: shortText(120),
        indoorBefore: z.number().min(0).max(5000),
        indoorAfter: z.number().min(0).max(5000),
      }),
    )
    .max(4),
});

export const coachRequest = z
  .object({
    mode: z.enum(['plan', 'ask', 'community']),
    language: z.enum(['en', 'hi']),
    question: shortText(500).optional(),
    context: coachContext,
  })
  .refine((body) => body.mode !== 'ask' || (body.question?.length ?? 0) >= 3, {
    message: 'A question of at least 3 characters is required in ask mode',
    path: ['question'],
  });

export type CoachRequest = z.infer<typeof coachRequest>;

/** Shapes the model must return; responses are re-validated before reaching the browser. */
export const planResult = z.object({
  headline: shortText(300),
  steps: z
    .array(z.object({ title: shortText(160), why: shortText(400), impact: shortText(240) }))
    .min(1)
    .max(6),
  caution: shortText(300),
});
export const answerResult = z.object({
  answer: shortText(1500),
  followUps: z.array(shortText(120)).max(3),
});
export const advisoryResult = z.object({ title: shortText(120), message: shortText(1200) });

export const resultSchemas = {
  plan: planResult,
  ask: answerResult,
  community: advisoryResult,
} as const;

export const firstIssue = (error: z.ZodError) => {
  const issue = error.issues[0];
  return issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'Invalid input';
};
