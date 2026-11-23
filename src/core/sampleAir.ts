import type { AirSnapshot, HourPoint } from './types';

/**
 * Synthetic but realistic winter-smog day for North India, used when live data cannot be
 * fetched (offline, upstream outage, tests). Shape: night-time inversion traps smoke,
 * mid-afternoon mixing clears it, evening traffic and heating build it back up.
 */
const PM25_SHAPE = [
  265, 270, 275, 280, 290, 300, 310, 305, 285, 250, 210, 175, 150, 135, 125, 128, 145, 185, 230,
  255, 265, 270, 268, 266,
];

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function point(date: string, hour: number, pm25: number): HourPoint {
  return {
    time: `${date}T${pad(hour)}:00`,
    pm2_5: pm25,
    pm10: Math.round(pm25 * 1.65),
    no2: Math.round(40 + pm25 * 0.25),
    o3: Math.round(hour >= 11 && hour <= 16 ? 70 : 20),
    so2: Math.round(12 + pm25 * 0.04),
    co: Math.round(900 + pm25 * 6),
  };
}

export function sampleSnapshot(now: Date = new Date()): AirSnapshot {
  const today = localDate(now);
  const tomorrow = localDate(new Date(now.getTime() + 24 * 3600 * 1000));
  const hourly = [
    ...PM25_SHAPE.map((pm, h) => point(today, h, pm)),
    ...PM25_SHAPE.map((pm, h) => point(tomorrow, h, Math.round(pm * 0.92))),
  ];
  const current = hourly[now.getHours()] ?? point(today, 0, PM25_SHAPE[0] ?? 265);
  return {
    place: { name: 'New Delhi (sample data)', lat: 28.61, lon: 77.21, country: 'India' },
    timezone: 'Asia/Kolkata',
    current,
    hourly,
    source: 'sample',
    fetchedAt: now.toISOString(),
  };
}
