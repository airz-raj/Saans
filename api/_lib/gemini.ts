import { fetchWithTimeout } from './http.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
/** Tried in order when the preferred model is slow, overloaded or unavailable. */
export const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
] as const;
/** Whole-request budget across all attempts; stays under the function's 30 s limit. */
export const TOTAL_BUDGET_MS = 25_000;
/** Start a parallel attempt on the next model if the current one has not answered by then. */
export const HEDGE_AFTER_MS = 4_000;
/** Pause after a failed attempt before trying the next model, so a load spike can clear. */
export const RETRY_PAUSE_MS = 500;
const ATTEMPT_TIMEOUT_MS = 15_000;
const MIN_ATTEMPT_MS = 2_000;

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
  /** Test hooks: overall budget, clock, pause after failure and hedge delay. */
  budgetMs?: number;
  now?: () => number;
  pauseMs?: number;
  hedgeMs?: number;
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
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${ENDPOINT}/${safeModel(model)}:generateContent`,
      {
        method: 'POST',
        signal,
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
    throw new GeminiError(`${model}: no response`, true);
  }
  if (!response.ok) {
    throw new GeminiError(
      `${model}: answered ${response.status}`,
      RETRYABLE_STATUS.has(response.status),
    );
  }
  const payload = (await response.json()) as GeminiPayload;
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new GeminiError(`${model}: empty response`, true);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiError(`${model}: malformed JSON`, true);
  }
}

/**
 * Calls Gemini generateContent with structured JSON output, hedged across models:
 * the preferred model starts first; if it fails, or is still silent after HEDGE_AFTER_MS,
 * the next model is started in parallel. The first valid answer wins and the rest are
 * aborted. Non-retryable errors (e.g. an invalid key) stop new attempts immediately.
 */
export function generateJson(options: GeminiOptions): Promise<unknown> {
  const preferred = options.model?.trim() ? options.model : DEFAULT_MODEL;
  const queue = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred), preferred];
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? TOTAL_BUDGET_MS);
  const hedgeMs = options.hedgeMs ?? HEDGE_AFTER_MS;
  const pauseMs = options.pauseMs ?? RETRY_PAUSE_MS;

  return new Promise((resolve, reject) => {
    const controllers = new Set<AbortController>();
    const failures: string[] = [];
    let next = 0;
    let running = 0;
    let stopped = false;
    let settled = false;
    let lastError: GeminiError | null = null;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      controllers.forEach((c) => c.abort());
      action();
    };

    const failIfIdle = () => {
      if (running === 0) {
        const summary = failures.join('; ') || 'no model attempted';
        finish(() =>
          reject(
            new GeminiError(
              `All Gemini attempts failed (${summary})`,
              lastError?.retryable ?? false,
            ),
          ),
        );
      }
    };

    const launch = () => {
      if (settled) return;
      clearTimeout(hedgeTimer);
      const remaining = deadline - now();
      const model = queue[next];
      if (stopped || !model || remaining < MIN_ATTEMPT_MS) {
        failIfIdle();
        return;
      }
      next += 1;
      running += 1;
      const controller = new AbortController();
      controllers.add(controller);
      callModel(model, options, Math.min(ATTEMPT_TIMEOUT_MS, remaining), controller.signal).then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => {
          running -= 1;
          controllers.delete(controller);
          lastError = error instanceof GeminiError ? error : new GeminiError(String(error));
          failures.push(lastError.message);
          if (!lastError.retryable) stopped = true;
          if (stopped) failIfIdle();
          else setTimeout(launch, pauseMs);
        },
      );
      hedgeTimer = setTimeout(launch, hedgeMs);
    };

    launch();
  });
}
