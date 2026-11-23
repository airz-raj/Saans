/** Small helpers shared by every function: JSON responses, client identity, origin checks. */

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
} as const;

export interface JsonInit {
  status?: number;
  /** Cache-Control value; defaults to no-store so personal data is never cached. */
  cache?: string;
  headers?: Record<string, string>;
}

export function json(body: unknown, init: JsonInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...BASE_HEADERS, 'Cache-Control': init.cache ?? 'no-store', ...init.headers },
  });
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, { status });
}

/** Best-effort client identifier for rate limiting (first hop of X-Forwarded-For on Vercel). */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'anonymous';
}

/**
 * Rejects browser requests coming from another site. Requests without an Origin header
 * (same-origin GETs, curl) are allowed; rate limiting still applies to them.
 */
export function isSameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export class BodyTooLargeError extends Error {}

/** Reads a JSON body with a hard size cap. Throws on oversize or invalid JSON. */
export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new BodyTooLargeError();
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new BodyTooLargeError();
  return JSON.parse(text) as unknown;
}

/** fetch with a timeout, so a slow upstream can never hang a function. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Honour a caller's signal too (e.g. a hedged request that lost the race).
  const external = init.signal;
  const onAbort = () => controller.abort();
  if (external?.aborted) controller.abort();
  external?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onAbort);
  }
}
