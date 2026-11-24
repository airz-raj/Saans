export const openMeteoAir = {
  latitude: 28.625,
  longitude: 77.25,
  timezone: 'Asia/Kolkata',
  current: {
    time: '2026-11-23T08:15',
    pm2_5: 301.4,
    pm10: 480,
    nitrogen_dioxide: 90,
    ozone: 12,
    sulphur_dioxide: 20,
    carbon_monoxide: 2400,
  },
  hourly: {
    time: Array.from(
      { length: 48 },
      (_, i) => `2026-11-${23 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`,
    ),
    pm2_5: Array.from({ length: 48 }, (_, i) => (i === 3 ? null : 200 + (i % 24))),
    pm10: Array.from({ length: 48 }, () => 350),
    nitrogen_dioxide: Array.from({ length: 48 }, () => 80),
    ozone: Array.from({ length: 48 }, () => 15),
    sulphur_dioxide: Array.from({ length: 48 }, () => 18),
    carbon_monoxide: Array.from({ length: 48 }, () => 2000),
  },
};

export const coachContext = {
  place: 'New Delhi',
  aqi: 438,
  category: 'Severe',
  dominant: 'PM2.5',
  pm25Now: 301,
  cleanWindow: '1 PM–4 PM',
  worstWindow: '5 AM–8 AM',
  forecast: [
    { time: '5 PM', pm25: 160 },
    { time: '6 PM', pm25: 190 },
  ],
  household: { persona: 'adult', children: 1, elders: 1, sensitiveMember: true },
  budget: {
    totalDoseUg: 2800,
    cigarettes: 11,
    whoMultiple: 16.1,
    top: [{ label: 'Walk / jog', doseUg: 430, sharePct: 15 }],
  },
  swaps: [{ title: 'Swap the outdoor session for an indoor workout', savedPct: 48, co2SavedKg: 0 }],
  hacks: [{ title: 'Build a box-fan filter', indoorBefore: 180, indoorAfter: 60 }],
};

/** The URL of whatever fetch was called with, as a string. */
export function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** A fetch stub that records calls and replies with the given body/status. */
export function stubFetch(body: unknown, status = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: urlOf(url), init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

export const geminiReply = (object: unknown) => ({
  candidates: [{ content: { parts: [{ text: JSON.stringify(object) }] } }],
});
