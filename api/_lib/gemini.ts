import { fetchWithTimeout } from './http.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
/** Tried in order when the preferred model is overloaded or unavailable. */
export const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite'] as const;
/** Whole-request budget across all attempts; stays under the function's 30 s limit. */
export const TOTAL_BUDGET_MS = 25_000;
const ATTEMPT_TIMEOUT_MS = 15_000;
const MIN_ATTEMPT_MS = 2_000;
/** Pause between attempts so a momentary overload spike can clear. */
export const RETRY_PAUSE_MS = 700;

export class GeminiError extends Error {
  constructor(
    message: string,
    /** True for overload, rate-limit, timeout and network failures worth retrying elsewhere. */
    readonly retryable = false,
  ) {
    super(message);
  }
}

export interface GeminiOptions {
  apiKey: string;
  model?: string;
  system: string;
  prompt: string;
  schema: object;
  fetchImpl?: typeof fetch;
  /** Overrides the whole-request budget (used by tests). */
  budgetMs?: number;
  now?: () => number;
  pauseMs?: number;
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const safeModel = (model: string) => model.replace(/[^a-z0-9.-]/gi, '');

async function callModel(
  model: string,
  options: GeminiOptions,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${ENDPOINT}/${safeModel(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.system }] },
          contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
            responseSchema: options.schema,
          },
        }),
      },
      timeoutMs,
      options.fetchImpl,
    );
  } catch {
    throw new GeminiError(`Gemini (${model}) did not respond in time`, true);
  }
  if (!response.ok) {
    throw new GeminiError(
      `Gemini (${model}) answered ${response.status}`,
      RETRYABLE_STATUS.has(response.status),
    );
  }
  const payload = (await response.json()) as GeminiPayload;
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new GeminiError(`Gemini (${model}) returned no content`, true);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiError(`Gemini (${model}) returned malformed JSON`, true);
  }
}

/**
 * Calls Gemini generateContent with structured JSON output. If the preferred model is
 * overloaded or times out, the same request is tried on fallback models while the overall
 * time budget allows.
 */
export async function generateJson(options: GeminiOptions): Promise<unknown> {
  const preferred = options.model || DEFAULT_MODEL;
  const fallbacks = FALLBACK_MODELS.filter((m) => m !== preferred);
  // Alternate between models, coming back to the preferred one after the first fallback.
  const models = [preferred, fallbacks[0], preferred, ...fallbacks.slice(1)].filter(
    (m): m is string => Boolean(m),
  );
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? TOTAL_BUDGET_MS);
  let lastError: GeminiError = new GeminiError('No Gemini model available');
  for (const [attempt, model] of models.entries()) {
    if (attempt > 0)
      await new Promise((resolve) => setTimeout(resolve, options.pauseMs ?? RETRY_PAUSE_MS));
    const remaining = deadline - now();
    if (remaining < MIN_ATTEMPT_MS) break;
    try {
      return await callModel(model, options, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    } catch (error) {
      lastError = error instanceof GeminiError ? error : new GeminiError(String(error));
      if (!lastError.retryable) break;
    }
  }
  throw lastError;
}
