/**
 * Browser-side API client. Adds a small TTL cache, de-duplicates identical in-flight
 * requests and supports cancellation, so re-renders and quick toggles never refetch.
 */
import type { CoachContext, CoachMode, CoachResultByMode, Language } from '../core/coach';
import type { AirSnapshot, HourPoint, Place } from '../core/types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The server says the client should fall back to its offline explanation. */
    readonly fallback = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const MINUTE = 60_000;
const TTL = { air: 10 * MINUTE, places: 60 * MINUTE, coach: 30 * MINUTE } as const;

interface CacheEntry {
  expires: number;
  value: unknown;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

/** Clears cached responses and pending requests (used by tests and on sign of stale data). */
export function clearApiCache(): void {
  cache.clear();
  inflight.clear();
}

interface ErrorBody {
  error?: unknown;
  fallback?: unknown;
}

async function send<T>(url: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const response = await fetch(url, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const { error, fallback } = (body ?? {}) as ErrorBody;
    throw new ApiError(
      typeof error === 'string' ? error : `Request failed (${response.status})`,
      response.status,
      fallback === true,
    );
  }
  return body as T;
}

/** Cached, de-duplicated request. Failures are never cached. */
async function request<T>(url: string, init: RequestInit, ttlMs: number, key = url): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = send<T>(url, init).then((value) => {
    cache.set(key, { expires: Date.now() + ttlMs, value });
    return value;
  });
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
  const url = `/api/air?lat=${place.lat.toFixed(2)}&lon=${place.lon.toFixed(2)}`;
  const body = await request<AirResponse>(url, { signal }, TTL.air);
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
  const url = `/api/geocode?q=${encodeURIComponent(query.trim())}`;
  const body = await request<{ results: Place[] }>(url, { signal }, TTL.places);
  return body.results;
}

export interface CoachPayload<M extends CoachMode> {
  mode: M;
  language: Language;
  question?: string;
  context: CoachContext;
}

/** Identical questions about identical numbers are answered once per session. */
export async function askCoach<M extends CoachMode>(
  payload: CoachPayload<M>,
): Promise<CoachResultByMode[M]> {
  const body = JSON.stringify(payload);
  const response = await request<{ result: CoachResultByMode[M] }>(
    '/api/coach',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
    TTL.coach,
    `coach:${body}`,
  );
  return response.result;
}
