/** GET /api/air?lat=..&lon=.. — normalised current + 48 h hourly air quality for a location. */
import { fail, json } from './_lib/http.js';
import { fetchAir } from './_lib/openMeteo.js';
import { airQuery, firstIssue } from './_lib/schemas.js';

/** Air data changes hourly; let the CDN serve it for 15 min and revalidate in the background. */
export const AIR_CACHE = 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800';

export function createAirHandler(fetchImpl: typeof fetch = fetch) {
  return async function handleAir(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parsed = airQuery.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return fail(400, firstIssue(parsed.error));
    try {
      const air = await fetchAir(parsed.data.lat, parsed.data.lon, fetchImpl);
      return json({ ...air, fetchedAt: new Date().toISOString() }, { cache: AIR_CACHE });
    } catch (error) {
      console.error('air upstream failure', error instanceof Error ? error.message : error);
      return fail(502, 'Live air data is unavailable right now');
    }
  };
}

export const GET = createAirHandler();
