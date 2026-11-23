import { installFetch } from '../testing/fakeFetch';
import { ApiError, askCoach, clearApiCache, fetchAir, searchPlaces } from './api';
import { sampleSnapshot } from '../core/sampleAir';
import { buildCoachContext } from '../core/coach';

const live = sampleSnapshot();
const place = { name: 'Gurugram', lat: 28.4595, lon: 77.0266 };

beforeEach(() => clearApiCache());
afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('rounds coordinates, caches results and de-duplicates concurrent requests', async () => {
    const fetchMock = installFetch(() => ({
      body: {
        timezone: 'Asia/Kolkata',
        current: live.current,
        hourly: live.hourly,
        fetchedAt: 'now',
      },
    }));
    const [a, b] = await Promise.all([fetchAir(place), fetchAir(place)]);
    await fetchAir(place);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/air?lat=28.46&lon=77.03');
    expect(a).toEqual(b);
    expect(a.source).toBe('live');
    expect(a.place).toBe(place);
  });

  it('surfaces server errors with their fallback flag', async () => {
    installFetch(() => ({
      status: 503,
      body: { error: 'AI coach is not configured', fallback: true },
    }));
    const context = buildCoachContext({
      placeName: 'X',
      aqi: { aqi: 100, category: 'Satisfactory', dominant: 'pm2_5', subIndices: {} },
      pm25Now: 50,
      cleanWindow: null,
      worstWindow: null,
      profile: (await import('../core/defaults')).DEFAULT_PROFILE,
      budget: {
        items: [],
        totalDose: 0,
        totalVolume: 0,
        exposureAvg: 0,
        cigarettes: 0,
        whoMultiple: 0,
      },
      swaps: [],
      hacks: [],
    });
    const error = await askCoach({ mode: 'plan', language: 'en', context }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 503,
      fallback: true,
      message: 'AI coach is not configured',
    });
  });

  it('does not cache failures', async () => {
    const fetchMock = installFetch(() => ({ status: 502, body: {} }));
    await expect(searchPlaces('Pune')).rejects.toThrow('Request failed (502)');
    await expect(searchPlaces('Pune')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('encodes search text', async () => {
    const fetchMock = installFetch(() => ({ body: { results: [] } }));
    await searchPlaces(' दिल्ली ');
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/geocode?q=${encodeURIComponent('दिल्ली')}`);
  });
});
