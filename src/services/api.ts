/**
 * Browser-side API client. Adds a small TTL cache, de-duplicates identical in-flight
 * requests and supports cancellation, so re-renders and quick toggles never refetch.
 */
import type {
  CoachAdvisory,
  CoachAnswer,
  CoachContext,
  CoachMode,
  CoachPlan,
  Language,
} from '../core/coach';
import type { AirSnapshot, HourPoint, Place } from '../core/types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fallback = false,
  ) {
    super(message);
  }
}

interface CacheEntry {
  expires: number;
  value: unknown;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function clearApiCache() {
  cache.clear();
  inflight.clear();
}

async function request<T>(url: string, init: RequestInit, ttlMs: number, key = url): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    const response = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new ApiError(
        typeof body.error === 'string' ? body.error : `Request failed (${response.status})`,
        response.status,
        body.fallback === true,
      );
    }
    if (ttlMs > 0) cache.set(key, { expires: Date.now() + ttlMs, value: body });
    return body as T;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

interface AirResponse {
  timezone: string;
  current: HourPoint;
  hourly: HourPoint[];
  fetchedAt: string;
}

export async function fetchAir(place: Place, signal?: AbortSignal): Promise<AirSnapshot> {
  const lat = place.lat.toFixed(2);
  const lon = place.lon.toFixed(2);
  const body = await request<AirResponse>(
    `/api/air?lat=${lat}&lon=${lon}`,
    { signal },
    10 * 60_000,
  );
  return {
    place,
    timezone: body.timezone,
    current: body.current,
    hourly: body.hourly,
    source: 'live',
    fetchedAt: body.fetchedAt,
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const body = await request<{ results: Place[] }>(
    `/api/geocode?q=${encodeURIComponent(query.trim())}`,
    { signal },
    60 * 60_000,
  );
  return body.results;
}

export type CoachResult<M extends CoachMode> = M extends 'plan'
  ? CoachPlan
  : M extends 'ask'
    ? CoachAnswer
    : CoachAdvisory;

export interface CoachPayload<M extends CoachMode> {
  mode: M;
  language: Language;
  question?: string;
  context: CoachContext;
}

/** Identical questions about identical numbers are answered once per session. */
export async function askCoach<M extends CoachMode>(
  payload: CoachPayload<M>,
): Promise<CoachResult<M>> {
  const body = JSON.stringify(payload);
  const response = await request<{ result: CoachResult<M> }>(
    '/api/coach',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
    30 * 60_000,
    `coach:${body}`,
  );
  return response.result;
}
