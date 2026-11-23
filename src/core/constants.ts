/**
 * Every numeric assumption used by Saans lives here so it can be reviewed and tuned.
 * Values are planning estimates for household decisions, not clinical or regulatory figures.
 */
import type {
  AqiCategory,
  CookingFuel,
  Effort,
  MaskType,
  Persona,
  Pollutant,
  Setting,
  TransportMode,
  WindowHabit,
} from './types';

/** [concentration low, concentration high, index low, index high] */
export type Band = readonly [number, number, number, number];

/**
 * India CPCB National Air Quality Index bands. Concentrations in µg/m³ except CO (mg/m³).
 * The last band of each pollutant is extended to a cap so values above the published
 * "Severe" threshold still map to 401–500.
 */
export const CPCB_BANDS: Record<Pollutant, readonly Band[]> = {
  pm2_5: [
    [0, 30, 0, 50],
    [30, 60, 50, 100],
    [60, 90, 100, 200],
    [90, 120, 200, 300],
    [120, 250, 300, 400],
    [250, 380, 400, 500],
  ],
  pm10: [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 250, 100, 200],
    [250, 350, 200, 300],
    [350, 430, 300, 400],
    [430, 600, 400, 500],
  ],
  no2: [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 180, 100, 200],
    [180, 280, 200, 300],
    [280, 400, 300, 400],
    [400, 800, 400, 500],
  ],
  o3: [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 168, 100, 200],
    [168, 208, 200, 300],
    [208, 748, 300, 400],
    [748, 1000, 400, 500],
  ],
  so2: [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 380, 100, 200],
    [380, 800, 200, 300],
    [800, 1600, 300, 400],
    [1600, 2400, 400, 500],
  ],
  co: [
    [0, 1, 0, 50],
    [1, 2, 50, 100],
    [2, 10, 100, 200],
    [10, 17, 200, 300],
    [17, 34, 300, 400],
    [34, 50, 400, 500],
  ],
};

export const AQI_CATEGORIES: readonly { max: number; category: AqiCategory }[] = [
  { max: 50, category: 'Good' },
  { max: 100, category: 'Satisfactory' },
  { max: 200, category: 'Moderate' },
  { max: 300, category: 'Poor' },
  { max: 400, category: 'Very Poor' },
  { max: 500, category: 'Severe' },
];

export const POLLUTANT_LABELS: Record<Pollutant, string> = {
  pm2_5: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  so2: 'SO₂',
  co: 'CO',
};

/** WHO 2021 24-hour PM2.5 guideline, µg/m³. */
export const WHO_PM25_24H = 15;
/** India CPCB 24-hour PM2.5 standard, µg/m³. */
export const CPCB_PM25_24H = 60;
/**
 * Rule of thumb popularised by Berkeley Earth: breathing ~22 µg/m³ PM2.5 for a day is
 * comparable, for health risk, to smoking one cigarette.
 */
export const PM25_PER_CIGARETTE_DAY = 22;

/** Typical adult inhalation rates by activity level, m³/h. */
export const BREATHING_RATE: Record<Effort, number> = {
  sleep: 0.3,
  rest: 0.45,
  light: 0.75,
  moderate: 1.5,
  vigorous: 2.7,
};

/** Absolute inhaled volume relative to an adult (children breathe less air, but more per kg). */
export const PERSONA_FACTOR: Record<Persona, number> = { adult: 1, child: 0.65, older: 0.9 };

/** Micro-environment PM2.5 relative to the city background for non-home settings. */
export const SETTING_FACTOR: Record<Exclude<Setting, 'home' | 'transit'>, number> = {
  office: 0.6, // mechanically ventilated building, some filtration
  school: 0.85, // naturally ventilated classrooms track outdoor air closely
  'outdoor-roadside': 1.25, // traffic plume next to the road
  'outdoor-green': 0.85, // park or campus set back from traffic
};

export interface ModeInfo {
  label: string;
  /** Door-to-door average speed incl. access and waiting, km/h. */
  speedKmh: number;
  /** Fossil CO₂ per passenger-km, kg. */
  co2PerKm: number;
  /** Local primary PM2.5 (exhaust + brake/tyre) per passenger-km, g. */
  pmPerKm: number;
  /** In-transit PM2.5 relative to city background. */
  exposureFactor: number;
  effort: Effort;
  /** Longest trip for which this mode is offered as an alternative, km. */
  maxKm: number;
}

export const MODES: Record<TransportMode, ModeInfo> = {
  walk: {
    label: 'Walk',
    speedKmh: 5,
    co2PerKm: 0,
    pmPerKm: 0,
    exposureFactor: 1.25,
    effort: 'light',
    maxKm: 2.5,
  },
  cycle: {
    label: 'Cycle',
    speedKmh: 13,
    co2PerKm: 0,
    pmPerKm: 0,
    exposureFactor: 1.2,
    effort: 'moderate',
    maxKm: 8,
  },
  'two-wheeler': {
    label: 'Two-wheeler',
    speedKmh: 28,
    co2PerKm: 0.05,
    pmPerKm: 0.02,
    exposureFactor: 1.35,
    effort: 'rest',
    maxKm: 60,
  },
  auto: {
    label: 'Auto-rickshaw',
    speedKmh: 22,
    co2PerKm: 0.07,
    pmPerKm: 0.02,
    exposureFactor: 1.3,
    effort: 'rest',
    maxKm: 30,
  },
  bus: {
    label: 'Bus',
    speedKmh: 16,
    co2PerKm: 0.035,
    pmPerKm: 0.008,
    exposureFactor: 1.1,
    effort: 'rest',
    maxKm: 60,
  },
  metro: {
    label: 'Metro',
    speedKmh: 30,
    co2PerKm: 0.025,
    pmPerKm: 0.002,
    exposureFactor: 0.75,
    effort: 'rest',
    maxKm: 60,
  },
  car: {
    label: 'Car (windows open)',
    speedKmh: 24,
    co2PerKm: 0.17,
    pmPerKm: 0.03,
    exposureFactor: 0.85,
    effort: 'rest',
    maxKm: 80,
  },
  'car-ac': {
    label: 'Car (AC on recirculation)',
    speedKmh: 24,
    co2PerKm: 0.18,
    pmPerKm: 0.03,
    exposureFactor: 0.45,
    effort: 'rest',
    maxKm: 80,
  },
};

/** Fraction of PM2.5 that still reaches the lungs with real-world fit. */
export const MASK_FACTOR: Record<MaskType, number> = {
  none: 1,
  cloth: 0.8,
  surgical: 0.65,
  n95: 0.3,
};

/** Indoor model parameters. */
export const INDOOR = {
  /** Fraction of outdoor particles that survive entry through the envelope. */
  penetration: { open: 1, closed: 0.8, sealed: 0.6 } satisfies Record<WindowHabit, number>,
  /** Air changes per hour. */
  airChanges: { open: 4, closed: 0.9, sealed: 0.4 } satisfies Record<WindowHabit, number>,
  /** PM2.5 deposition onto surfaces, 1/h. */
  depositionRate: 0.2,
  /** Source strengths, µg/h. */
  cookingSource: { induction: 1_500, lpg: 5_000, biomass: 250_000, none: 0 } satisfies Record<
    CookingFuel,
    number
  >,
  kitchenExhaustCapture: 0.6,
  incenseSource: 15_000,
  mosquitoCoilSource: 40_000,
  smokingSource: 12_000,
  /** A MERV-13 filter strapped to a box fan; deliberately conservative. */
  diyFilterCadr: 250,
  /** 1 CFM in m³/h, for purifier labels sold in CFM. */
  cfmToM3h: 1.699,
} as const;

/** Share of waking time at home that incense or cigarettes are actually burning. */
export const HOME_SOURCE_DUTY = 0.15;

/** Clean-window search limits (local hours). */
export const AWAKE_HOURS = { from: 6, to: 22 } as const;

/** Minimum improvement for a swap to be shown. */
export const SWAP_THRESHOLD = { minFraction: 0.05, minMicrograms: 5 } as const;
