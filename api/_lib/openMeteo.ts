import { fetchWithTimeout } from './http.js';

const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Open-Meteo variable → Saans pollutant key. */
const VARIABLES = {
  pm2_5: 'pm2_5',
  pm10: 'pm10',
  nitrogen_dioxide: 'no2',
  ozone: 'o3',
  sulphur_dioxide: 'so2',
  carbon_monoxide: 'co',
} as const;
type Upstream = keyof typeof VARIABLES;
type Key = (typeof VARIABLES)[Upstream];

export interface NormalisedHour extends Record<Key, number> {
  time: string;
}
export interface NormalisedAir {
  lat: number;
  lon: number;
  timezone: string;
  current: NormalisedHour;
  hourly: NormalisedHour[];
}

interface AirPayload {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
}

export class UpstreamError extends Error {}

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

/** Replaces gaps (null) with the nearest earlier value, then the nearest later one. */
export function fillGaps(values: readonly unknown[]): number[] {
  const parsed = values.map(num);
  const firstValid = parsed.find((v) => v !== null) ?? 0;
  let last = firstValid;
  return parsed.map((value) => {
    if (value !== null) last = value;
    return Math.round((value ?? last) * 10) / 10;
  });
}

export function normaliseAir(payload: AirPayload): NormalisedAir {
  const times = payload.hourly?.time;
  if (!Array.isArray(times) || times.length === 0 || typeof payload.timezone !== 'string') {
    throw new UpstreamError('Air quality response is missing hourly data');
  }
  const series = Object.fromEntries(
    (Object.keys(VARIABLES) as Upstream[]).map((name) => {
      const raw = payload.hourly?.[name];
      return [VARIABLES[name], fillGaps(Array.isArray(raw) ? raw : [])];
    }),
  ) as Record<Key, number[]>;

  const hourly: NormalisedHour[] = times.map((time, i) => ({
    time: String(time).slice(0, 16),
    pm2_5: series.pm2_5[i] ?? 0,
    pm10: series.pm10[i] ?? 0,
    no2: series.no2[i] ?? 0,
    o3: series.o3[i] ?? 0,
    so2: series.so2[i] ?? 0,
    co: series.co[i] ?? 0,
  }));

  const currentTime =
    typeof payload.current?.time === 'string' ? payload.current.time.slice(0, 16) : '';
  const matching =
    hourly.find((h) => h.time.slice(0, 13) === currentTime.slice(0, 13)) ?? hourly[0];
  if (!matching) throw new UpstreamError('Air quality response has no hours');
  const current = { ...matching, time: currentTime || matching.time };
  for (const name of Object.keys(VARIABLES) as Upstream[]) {
    const value = num(payload.current?.[name]);
    if (value !== null) current[VARIABLES[name]] = Math.round(value * 10) / 10;
  }

  return {
    lat: payload.latitude ?? 0,
    lon: payload.longitude ?? 0,
    timezone: payload.timezone,
    current,
    hourly,
  };
}

export async function fetchAir(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalisedAir> {
  const variables = Object.keys(VARIABLES).join(',');
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: variables,
    hourly: variables,
    timezone: 'auto',
    forecast_days: '2',
  });
  const response = await fetchWithTimeout(`${AIR_URL}?${params}`, {}, 8000, fetchImpl);
  if (!response.ok) throw new UpstreamError(`Air quality service answered ${response.status}`);
  return normaliseAir((await response.json()) as AirPayload);
}

export interface GeoResult {
  name: string;
  admin?: string;
  country?: string;
  lat: number;
  lon: number;
}

export async function searchPlaces(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoResult[]> {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const response = await fetchWithTimeout(`${GEO_URL}?${params}`, {}, 6000, fetchImpl);
  if (!response.ok) throw new UpstreamError(`Geocoding service answered ${response.status}`);
  const payload = (await response.json()) as { results?: Record<string, unknown>[] };
  return (payload.results ?? [])
    .filter((r) => typeof r.name === 'string' && num(Math.abs(Number(r.latitude))) !== null)
    .slice(0, 5)
    .map((r) => ({
      name: String(r.name).slice(0, 80),
      admin: typeof r.admin1 === 'string' ? r.admin1.slice(0, 80) : undefined,
      country: typeof r.country === 'string' ? r.country.slice(0, 80) : undefined,
      lat: Math.round(Number(r.latitude) * 100) / 100,
      lon: Math.round(Number(r.longitude) * 100) / 100,
    }));
}
