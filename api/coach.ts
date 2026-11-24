/**
 * POST /api/coach — Gemini-written plan, answer or community advisory, grounded on the
 * numbers Saans computed in the browser. Responds 503/502 with `{ fallback: true }` when the
 * model is unavailable so the client can show its deterministic explanation instead.
 */
import { generateJson, GeminiError } from './_lib/gemini.js';
import { BodyTooLargeError, clientKey, fail, isSameOrigin, json, readJson } from './_lib/http.js';
import { log } from './_lib/log.js';
import { buildPrompt, RESPONSE_SCHEMAS, SYSTEM_INSTRUCTION } from './_lib/prompt.js';
import { createRateLimiter, type RateLimiter } from './_lib/rateLimit.js';
import {
  coachRequestSchema,
  coachResultSchemas,
  firstIssue,
  type CoachRequest,
} from './_lib/schemas.js';

export interface CoachDeps {
  apiKey: string | undefined;
  model: string | undefined;
  limiter: RateLimiter;
  fetchImpl?: typeof fetch;
  /** Pause between model attempts; tests set 0. */
  retryPauseMs?: number;
}

type Handler = (request: Request) => Promise<Response>;

/** Rejects requests that are cross-site, not JSON or over the client's rate limit. */
function guard(request: Request, limiter: RateLimiter): Response | null {
  if (!isSameOrigin(request)) return fail(403, 'Cross-site requests are not allowed');
  if (!request.headers.get('content-type')?.includes('application/json'))
    return fail(415, 'Send JSON');
  const quota = limiter.take(clientKey(request));
  if (quota.allowed) return null;
  return json(
    { error: 'Too many requests, please wait a moment', fallback: true },
    { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds) } },
  );
}

/** Parses and validates the body into a coach request, or returns the error response. */
async function parseRequest(request: Request): Promise<CoachRequest | Response> {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return error instanceof BodyTooLargeError
      ? fail(413, 'Request too large')
      : fail(400, 'Invalid JSON');
  }
  const parsed = coachRequestSchema.safeParse(body);
  return parsed.success ? parsed.data : fail(400, firstIssue(parsed.error));
}

/** Asks Gemini and re-validates its answer against the schema for the requested mode. */
async function askModel(
  request: CoachRequest,
  deps: CoachDeps & { apiKey: string },
): Promise<unknown> {
  const raw = await generateJson({
    apiKey: deps.apiKey,
    model: deps.model,
    system: SYSTEM_INSTRUCTION,
    prompt: buildPrompt(request),
    schema: RESPONSE_SCHEMAS[request.mode],
    fetchImpl: deps.fetchImpl,
    pauseMs: deps.retryPauseMs,
  });
  const result = coachResultSchemas[request.mode].safeParse(raw);
  if (!result.success) throw new GeminiError('Model output failed validation');
  return result.data;
}

export function createCoachHandler(deps: CoachDeps): Handler {
  return async function handleCoach(request) {
    const rejected = guard(request, deps.limiter);
    if (rejected) return rejected;

    const parsed = await parseRequest(request);
    if (parsed instanceof Response) return parsed;

    const { apiKey } = deps;
    if (!apiKey) return fail(503, 'AI coach is not configured', { fallback: true });

    try {
      const result = await askModel(parsed, { ...deps, apiKey });
      return json({ source: 'gemini', mode: parsed.mode, result });
    } catch (error) {
      log('error', 'coach.failure', error);
      return fail(502, 'AI coach could not answer right now', { fallback: true });
    }
  };
}

export const POST = createCoachHandler({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
  limiter: createRateLimiter(8, 8),
});
