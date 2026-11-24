import { z } from 'zod';

export {
  coachRequestSchema,
  coachResultSchemas,
  type CoachRequest,
} from '../../shared/coachContract.js';

/** Coordinates are rounded to ~1 km: enough for city air data, kinder to privacy and caches. */
const coordinate = (min: number, max: number): z.ZodType<number> =>
  z.coerce
    .number()
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

/** First validation problem as a short, user-safe message such as "lat: Too big…". */
export const firstIssue = (error: z.ZodError): string => {
  const issue = error.issues[0];
  return issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'Invalid input';
};
