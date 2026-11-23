/** Shared domain types for the Saans engine. All concentrations are µg/m³ unless stated. */

export const POLLUTANTS = ['pm2_5', 'pm10', 'no2', 'o3', 'so2', 'co'] as const;
export type Pollutant = (typeof POLLUTANTS)[number];
export type Concentrations = Record<Pollutant, number>;

export interface Place {
  name: string;
  lat: number;
  lon: number;
  admin?: string;
  country?: string;
}

export interface HourPoint extends Concentrations {
  /** Local ISO time, e.g. "2026-11-23T07:00". */
  time: string;
}

export interface AirSnapshot {
  place: Place;
  timezone: string;
  current: HourPoint;
  /** Hourly forecast starting at 00:00 local time today; 48 entries = today + tomorrow. */
  hourly: HourPoint[];
  source: 'live' | 'sample';
  fetchedAt: string;
}

export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export interface AqiResult {
  aqi: number;
  category: AqiCategory;
  dominant: Pollutant;
  subIndices: Partial<Record<Pollutant, number>>;
}

export type Persona = 'adult' | 'child' | 'older';
export type Effort = 'sleep' | 'rest' | 'light' | 'moderate' | 'vigorous';
export type Setting =
  'home' | 'office' | 'school' | 'outdoor-roadside' | 'outdoor-green' | 'transit';
export type TransportMode =
  'walk' | 'cycle' | 'two-wheeler' | 'auto' | 'bus' | 'metro' | 'car' | 'car-ac';
export type MaskType = 'none' | 'cloth' | 'surgical' | 'n95';
export type ActivityKind =
  'sleep' | 'home' | 'cooking' | 'commute' | 'work' | 'exercise' | 'errand';

export interface Activity {
  id: string;
  label: string;
  kind: ActivityKind;
  /** Start time in hours from local midnight, 0 ≤ start < 24, quarter-hour steps. */
  start: number;
  /** Duration in hours, 0.25 … 12. */
  duration: number;
  setting: Setting;
  effort: Effort;
  mode?: TransportMode;
  distanceKm?: number;
  mask?: MaskType;
  /** A portable cleaner (e.g. DIY box-fan filter) running in the room during this activity. */
  extraCadr?: number;
}

export type WindowHabit = 'open' | 'closed' | 'sealed';
export type CookingFuel = 'induction' | 'lpg' | 'biomass' | 'none';

export interface RoomSetup {
  areaM2: number;
  ceilingM: number;
  windows: WindowHabit;
  /** Clean air delivery rate of purifiers in the room, m³/h (0 = none). */
  purifierCadr: number;
  cookingFuel: CookingFuel;
  kitchenExhaust: boolean;
  incense: boolean;
  mosquitoCoil: boolean;
  smoking: boolean;
}

export interface Profile {
  place: Place | null;
  persona: Persona;
  children: number;
  elders: number;
  /** Someone at home has asthma, COPD, heart disease or is pregnant. */
  sensitiveMember: boolean;
  commuteMode: TransportMode | 'none';
  commuteKm: number;
  departHour: number;
  returnHour: number;
  exerciseHour: number | null;
  exerciseMinutes: number;
  exerciseSetting: 'outdoor-roadside' | 'outdoor-green' | 'home';
  room: RoomSetup;
  language: 'en' | 'hi';
}

export interface ActivityDose {
  activity: Activity;
  /** Concentration in the micro-environment during the activity. */
  concentration: number;
  /** Volume of air inhaled, m³. */
  volume: number;
  /** PM2.5 inhaled, µg. */
  dose: number;
}

export interface DayBudget {
  items: ActivityDose[];
  totalDose: number;
  totalVolume: number;
  /** Time-weighted exposure concentration over 24 h, µg/m³. */
  exposureAvg: number;
  cigarettes: number;
  /** Multiples of the WHO 24-h guideline. */
  whoMultiple: number;
}

export type SwapKind = 'shift' | 'mode' | 'setting' | 'mask' | 'cleaner';

export interface Swap {
  id: string;
  kind: SwapKind;
  activityId: string;
  title: string;
  before: Activity;
  after: Activity;
  doseBefore: number;
  doseAfter: number;
  doseSaved: number;
  /** Fossil CO₂ avoided in kg (negative = more emissions). */
  co2Saved: number;
  minutesDelta: number;
}
