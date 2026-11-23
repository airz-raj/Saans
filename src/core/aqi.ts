import { AQI_CATEGORIES, CPCB_BANDS } from './constants';
import type { AqiCategory, AqiResult, Concentrations, Pollutant } from './types';
import { POLLUTANTS } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Converts a pollutant reading to the unit used by its CPCB bands (CO is banded in mg/m³). */
const toBandUnit = (pollutant: Pollutant, microgramsPerM3: number) =>
  pollutant === 'co' ? microgramsPerM3 / 1000 : microgramsPerM3;

/**
 * CPCB sub-index for one pollutant by linear interpolation inside its band.
 * Returns null for missing or invalid readings.
 */
export function subIndex(pollutant: Pollutant, microgramsPerM3: number): number | null {
  if (!Number.isFinite(microgramsPerM3) || microgramsPerM3 < 0) return null;
  const value = toBandUnit(pollutant, microgramsPerM3);
  const bands = CPCB_BANDS[pollutant];
  const band = bands.find(([, hi]) => value <= hi) ?? bands[bands.length - 1];
  if (!band) return null;
  const [cLo, cHi, iLo, iHi] = band;
  const index = iLo + ((clamp(value, cLo, cHi) - cLo) * (iHi - iLo)) / (cHi - cLo);
  return Math.round(index);
}

export function categoryFor(aqi: number): AqiCategory {
  const found = AQI_CATEGORIES.find(({ max }) => aqi <= max);
  return found ? found.category : 'Severe';
}

/** Overall AQI = the worst sub-index; the pollutant behind it is "dominant". */
export function computeAqi(reading: Concentrations): AqiResult {
  const subIndices: Partial<Record<Pollutant, number>> = {};
  let aqi = 0;
  let dominant: Pollutant = 'pm2_5';
  for (const pollutant of POLLUTANTS) {
    const index = subIndex(pollutant, reading[pollutant]);
    if (index === null) continue;
    subIndices[pollutant] = index;
    if (index > aqi) {
      aqi = index;
      dominant = pollutant;
    }
  }
  return { aqi, category: categoryFor(aqi), dominant, subIndices };
}

/** Stable, CSS-friendly token for a category (used for colours and test ids). */
export const categoryToken = (category: AqiCategory) =>
  category.toLowerCase().replace(/\s+/g, '-') as
    'good' | 'satisfactory' | 'moderate' | 'poor' | 'very-poor' | 'severe';
