import { AIR_CACHE, createAirHandler } from '../../api/air';
import { createGeocodeHandler, GEO_CACHE } from '../../api/geocode';
import { fillGaps, normaliseAir } from '../../api/_lib/openMeteo';
import { openMeteoAir, stubFetch } from './fixtures';

// Handlers log upstream failures on purpose; keep test output readable.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const get = (path: string) => new Request(`https://saans.test${path}`);

describe('GET /api/air', () => {
  it('returns normalised data with CDN caching', async () => {
    const { fetchImpl, calls } = stubFetch(openMeteoAir);
    const response = await createAirHandler(fetchImpl)(get('/api/air?lat=28.6139&lon=77.2090'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(AIR_CACHE);
    const body = await response.json();
    expect(body.hourly).toHaveLength(48);
    expect(body.current).toMatchObject({
      time: '2026-11-23T08:15',
      pm2_5: 301.4,
      no2: 90,
      co: 2400,
    });
    expect(body.hourly[3].pm2_5).toBe(202); // gap filled from the previous hour
    expect(calls[0]?.url).toContain('latitude=28.61');
    expect(calls[0]?.url).toContain('longitude=77.21');
  });

  it.each([
    '/api/air',
    '/api/air?lat=abc&lon=1',
    '/api/air?lat=91&lon=0',
    '/api/air?lat=0&lon=200',
  ])('rejects bad coordinates: %s', async (path) => {
    const { fetchImpl, calls } = stubFetch(openMeteoAir);
    const response = await createAirHandler(fetchImpl)(get(path));
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('hides upstream failures behind a 502', async () => {
    const { fetchImpl } = stubFetch({ reason: 'down' }, 500);
    const response = await createAirHandler(fetchImpl)(get('/api/air?lat=1&lon=1'));
    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects payloads without hourly data', () => {
    expect(() => normaliseAir({ timezone: 'UTC' })).toThrow(/missing hourly/);
  });
});

describe('fillGaps', () => {
  it('carries values across nulls and negative readings', () => {
    expect(fillGaps([null, 5, null, -1, 7])).toEqual([5, 5, 5, 5, 7]);
    expect(fillGaps([null, null])).toEqual([0, 0]);
  });
});

describe('GET /api/geocode', () => {
  const upstream = {
    results: [
      {
        name: 'Gurugram',
        admin1: 'Haryana',
        country: 'India',
        latitude: 28.4595,
        longitude: 77.0266,
      },
      { name: 'Bad', latitude: 'x', longitude: 1 },
    ],
  };

  it('returns trimmed, rounded places', async () => {
    const { fetchImpl } = stubFetch(upstream);
    const response = await createGeocodeHandler(fetchImpl)(get('/api/geocode?q=Gurugram'));
    expect(response.headers.get('cache-control')).toBe(GEO_CACHE);
    expect(await response.json()).toEqual({
      results: [{ name: 'Gurugram', admin: 'Haryana', country: 'India', lat: 28.46, lon: 77.03 }],
    });
  });

  it.each(['', 'a', '<script>', 'x'.repeat(61), 'Delhi; DROP'])('rejects query %j', async (q) => {
    const { fetchImpl, calls } = stubFetch(upstream);
    const response = await createGeocodeHandler(fetchImpl)(
      get(`/api/geocode?q=${encodeURIComponent(q)}`),
    );
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('accepts names in Indian scripts', async () => {
    const { fetchImpl } = stubFetch({ results: [] });
    const response = await createGeocodeHandler(fetchImpl)(
      get(`/api/geocode?q=${encodeURIComponent('दिल्ली')}`),
    );
    expect(response.status).toBe(200);
  });

  it('returns 502 when the upstream fails', async () => {
    const { fetchImpl } = stubFetch('oops', 503);
    expect((await createGeocodeHandler(fetchImpl)(get('/api/geocode?q=Pune'))).status).toBe(502);
  });
});
