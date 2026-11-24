/** GET /api/air?lat=..&lon=.. — normalised current + 48 h hourly air quality for a location. */
import { clientKey, fail, json } from './_lib/http.js';
import { log } from './_lib/log.js';
import { fetchAir } from './_lib/openMeteo.js';
import { createRateLimiter, type RateLimiter } from './_lib/rateLimit.js';
import { airQuery, firstIssue } from './_lib/schemas.js';

/** Air data changes hourly; let the CDN serve it for 15 min and revalidate in the background. */
export const AIR_CACHE = 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800';

export function createAirHandler(
  fetchImpl: typeof fetch = fetch,
  limiter: RateLimiter = createRateLimiter(60, 60),
): (request: Request) => Promise<Response> {
  return async function handleAir(request) {
    const parsed = airQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return fail(400, firstIssue(parsed.error));
    if (!limiter.take(clientKey(request)).allowed) return fail(429, 'Too many requests');
    try {
      const air = await fetchAir(parsed.data.lat, parsed.data.lon, fetchImpl);
      return json({ ...air, fetchedAt: new Date().toISOString() }, { cache: AIR_CACHE });
    } catch (error) {
      log('error', 'air.upstream_failure', error);
      return fail(502, 'Live air data is unavailable right now');
    }
  };
}

export const GET = createAirHandler();
