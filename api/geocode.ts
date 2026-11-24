/** GET /api/geocode?q=.. — up to five matching places for a city or locality name. */
import { clientKey, fail, json } from './_lib/http.js';
import { log } from './_lib/log.js';
import { searchPlaces } from './_lib/openMeteo.js';
import { createRateLimiter, type RateLimiter } from './_lib/rateLimit.js';
import { firstIssue, geocodeQuery } from './_lib/schemas.js';

export const GEO_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export function createGeocodeHandler(
  fetchImpl: typeof fetch = fetch,
  limiter: RateLimiter = createRateLimiter(30, 30),
): (request: Request) => Promise<Response> {
  return async function handleGeocode(request) {
    const parsed = geocodeQuery.safeParse({ q: new URL(request.url).searchParams.get('q') ?? '' });
    if (!parsed.success) return fail(400, firstIssue(parsed.error));
    if (!limiter.take(clientKey(request)).allowed) return fail(429, 'Too many requests');
    try {
      return json({ results: await searchPlaces(parsed.data.q, fetchImpl) }, { cache: GEO_CACHE });
    } catch (error) {
      log('error', 'geocode.upstream_failure', error);
      return fail(502, 'Place search is unavailable right now');
    }
  };
}

export const GET = createGeocodeHandler();
