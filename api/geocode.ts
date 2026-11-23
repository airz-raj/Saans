/** GET /api/geocode?q=.. — up to five matching places for a city or locality name. */
import { fail, json } from './_lib/http.js';
import { searchPlaces } from './_lib/openMeteo.js';
import { firstIssue, geocodeQuery } from './_lib/schemas.js';

export const GEO_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export function createGeocodeHandler(fetchImpl: typeof fetch = fetch) {
  return async function handleGeocode(request: Request): Promise<Response> {
    const parsed = geocodeQuery.safeParse({ q: new URL(request.url).searchParams.get('q') ?? '' });
    if (!parsed.success) return fail(400, firstIssue(parsed.error));
    try {
      return json({ results: await searchPlaces(parsed.data.q, fetchImpl) }, { cache: GEO_CACHE });
    } catch (error) {
      console.error('geocode upstream failure', error instanceof Error ? error.message : error);
      return fail(502, 'Place search is unavailable right now');
    }
  };
}

export const GET = createGeocodeHandler();
