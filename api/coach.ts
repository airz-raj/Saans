/**
 * POST /api/coach — Gemini-written plan, answer or community advisory, grounded on the
 * numbers Saans computed in the browser. Responds 503 { fallback: true } when the model is
 * unavailable so the client can show its deterministic explanation instead.
 */
import { generateJson, GeminiError } from './_lib/gemini.js';
import { BodyTooLargeError, clientKey, fail, isSameOrigin, json, readJson } from './_lib/http.js';
import { buildPrompt, RESPONSE_SCHEMAS, SYSTEM_INSTRUCTION } from './_lib/prompt.js';
import { createRateLimiter, type RateLimiter } from './_lib/rateLimit.js';
import { coachRequest, firstIssue, resultSchemas } from './_lib/schemas.js';

export interface CoachDeps {
  apiKey: string | undefined;
  model: string | undefined;
  limiter: RateLimiter;
  fetchImpl?: typeof fetch;
  /** Pause between model attempts; tests set 0. */
  retryPauseMs?: number;
}

export function createCoachHandler(deps: CoachDeps) {
  return async function handleCoach(request: Request): Promise<Response> {
    if (!isSameOrigin(request)) return fail(403, 'Cross-site requests are not allowed');
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return fail(415, 'Send JSON');
    }

    const quota = deps.limiter.take(clientKey(request));
    if (!quota.allowed) {
      return json(
        { error: 'Too many requests, please wait a moment', fallback: true },
        { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds) } },
      );
    }

    let body: unknown;
    try {
      body = await readJson(request);
    } catch (error) {
      return error instanceof BodyTooLargeError
        ? fail(413, 'Request too large')
        : fail(400, 'Invalid JSON');
    }
    const parsed = coachRequest.safeParse(body);
    if (!parsed.success) return fail(400, firstIssue(parsed.error));

    if (!deps.apiKey) return fail(503, 'AI coach is not configured', { fallback: true });

    const { mode } = parsed.data;
    try {
      const raw = await generateJson({
        apiKey: deps.apiKey,
        model: deps.model,
        system: SYSTEM_INSTRUCTION,
        prompt: buildPrompt(parsed.data),
        schema: RESPONSE_SCHEMAS[mode],
        fetchImpl: deps.fetchImpl,
        pauseMs: deps.retryPauseMs,
      });
      const result = resultSchemas[mode].safeParse(raw);
      if (!result.success) throw new GeminiError('Model output failed validation');
      return json({ source: 'gemini', mode, result: result.data });
    } catch (error) {
      console.error('coach failure', error instanceof Error ? error.message : 'unknown');
      return fail(502, 'AI coach could not answer right now', { fallback: true });
    }
  };
}

export const POST = createCoachHandler({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
  limiter: createRateLimiter(8, 8),
});
