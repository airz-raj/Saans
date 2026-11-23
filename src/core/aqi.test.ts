import { categoryFor, categoryToken, computeAqi, subIndex } from './aqi';
import type { Concentrations } from './types';

const clean: Concentrations = { pm2_5: 10, pm10: 20, no2: 10, o3: 20, so2: 5, co: 300 };

describe('subIndex (CPCB)', () => {
  it.each([
    [0, 0],
    [30, 50],
    [45, 75],
    [60, 100],
    [90, 200],
    [120, 300],
    [250, 400],
  ])('maps PM2.5 %d µg/m³ to %d', (value, expected) => {
    expect(subIndex('pm2_5', value)).toBe(expected);
  });

  it('caps extreme concentrations at 500', () => {
    expect(subIndex('pm2_5', 900)).toBe(500);
    expect(subIndex('pm10', 1200)).toBe(500);
  });

  it('bands CO in mg/m³ while readings arrive in µg/m³', () => {
    expect(subIndex('co', 1000)).toBe(50);
    expect(subIndex('co', 2000)).toBe(100);
  });

  it('rejects invalid readings', () => {
    expect(subIndex('pm10', -1)).toBeNull();
    expect(subIndex('no2', Number.NaN)).toBeNull();
    expect(subIndex('o3', Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('computeAqi', () => {
  it('reports the worst sub-index and its pollutant', () => {
    const result = computeAqi({ ...clean, pm2_5: 300, pm10: 400 });
    expect(result.dominant).toBe('pm2_5');
    expect(result.aqi).toBe(438);
    expect(result.category).toBe('Severe');
    expect(result.subIndices.pm10).toBe(363);
  });

  it('identifies a non-particle dominant pollutant', () => {
    const result = computeAqi({ ...clean, no2: 250 });
    expect(result.dominant).toBe('no2');
    expect(result.category).toBe('Poor');
  });

  it('skips missing values', () => {
    const result = computeAqi({ ...clean, so2: Number.NaN });
    expect(result.subIndices.so2).toBeUndefined();
    expect(result.category).toBe('Good');
  });
});

describe('categories', () => {
  it.each([
    [50, 'Good'],
    [51, 'Satisfactory'],
    [200, 'Moderate'],
    [201, 'Poor'],
    [350, 'Very Poor'],
    [499, 'Severe'],
    [700, 'Severe'],
  ] as const)('AQI %d is %s', (aqi, category) => {
    expect(categoryFor(aqi)).toBe(category);
  });

  it('creates CSS-safe tokens', () => {
    expect(categoryToken('Very Poor')).toBe('very-poor');
    expect(categoryToken('Good')).toBe('good');
  });
});
