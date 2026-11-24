/**
 * The contract between the browser and the AI coach endpoint — the single source of truth
 * for both sides. The server validates requests and model output with these schemas at
 * runtime; the browser imports only the inferred types, so zod never enters the client bundle.
 */
import { z } from 'zod';

const shortText = (max: number) => z.string().trim().max(max);
const count = z.number().int().min(0).max(20);

export const coachContextSchema = z.object({
  place: shortText(80),
  aqi: z.number().min(0).max(500),
  category: z.enum(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe']),
  dominant: shortText(10),
  pm25Now: z.number().min(0).max(2000),
  cleanWindow: shortText(40).nullable(),
  worstWindow: shortText(40).nullable(),
  forecast: z
    .array(z.object({ time: shortText(10), pm25: z.number().min(0).max(2000) }))
    .max(24)
    .default([]),
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

export const coachRequestSchema = z
  .object({
    mode: z.enum(['plan', 'ask', 'community']),
    language: z.enum(['en', 'hi']),
    question: shortText(500).optional(),
    context: coachContextSchema,
  })
  .refine((body) => body.mode !== 'ask' || (body.question?.length ?? 0) >= 3, {
    message: 'A question of at least 3 characters is required in ask mode',
    path: ['question'],
  });

/** Shapes the model must return; responses are re-validated before reaching the browser. */
export const coachPlanSchema = z.object({
  headline: shortText(300),
  steps: z
    .array(z.object({ title: shortText(160), why: shortText(400), impact: shortText(240) }))
    .min(1)
    .max(6),
  caution: shortText(300),
});
export const coachAnswerSchema = z.object({
  answer: shortText(1500),
  followUps: z.array(shortText(120)).max(3),
});
export const coachAdvisorySchema = z.object({ title: shortText(120), message: shortText(1200) });

export const coachResultSchemas = {
  plan: coachPlanSchema,
  ask: coachAnswerSchema,
  community: coachAdvisorySchema,
} as const;

export type CoachMode = z.infer<typeof coachRequestSchema>['mode'];
export type Language = z.infer<typeof coachRequestSchema>['language'];
export type CoachContext = z.infer<typeof coachContextSchema>;
export type CoachRequest = z.infer<typeof coachRequestSchema>;
export type CoachPlan = z.infer<typeof coachPlanSchema>;
export type CoachAnswer = z.infer<typeof coachAnswerSchema>;
export type CoachAdvisory = z.infer<typeof coachAdvisorySchema>;
/** The result type the coach returns for each mode. */
export interface CoachResultByMode {
  plan: CoachPlan;
  ask: CoachAnswer;
  community: CoachAdvisory;
}
