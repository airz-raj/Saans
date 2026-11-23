import {
  cleanestCommute,
  commuteSwap,
  LIFESTYLE_SWAPS,
  scaleImpact,
  tripEmissions,
  weeklyImpact,
} from './emissions';

describe('emissions', () => {
  it('computes per-trip CO₂ and PM from mode factors', () => {
    expect(tripEmissions('car', 10).co2Kg).toBeCloseTo(1.7);
    expect(tripEmissions('cycle', 10)).toEqual({ co2Kg: 0, pmG: 0 });
    expect(tripEmissions('bus', -5).co2Kg).toBe(0);
  });

  it('derives a commute swap for both directions', () => {
    const swap = commuteSwap('two-wheeler', 8, 'metro');
    expect(swap.co2Kg).toBeCloseTo(16 * (0.05 - 0.025));
    expect(swap.pmG).toBeGreaterThan(0);
    expect(swap.from).toContain('8 km');
  });

  it.each([
    ['car', 10, 'metro'],
    ['car', 5, 'cycle'],
    ['auto', 2, 'walk'],
    ['walk', 2, null],
  ] as const)('cleanest alternative to %s for %d km is %s', (mode, km, expected) => {
    expect(cleanestCommute(mode, km)).toBe(expected);
  });

  it('totals weekly impact and scales to a community', () => {
    const [first, second] = LIFESTYLE_SWAPS;
    const weekly = weeklyImpact([
      { swap: first!, perWeek: 2 },
      { swap: second!, perWeek: 1 },
      { swap: first!, perWeek: -3 },
    ]);
    expect(weekly.pmG).toBeCloseTo(first!.pmG * 2 + second!.pmG);
    const community = scaleImpact(weekly, 200, 16);
    expect(community.pmG).toBeCloseTo(weekly.pmG * 3200);
    expect(scaleImpact(weekly, -1).co2Kg).toBe(0);
  });

  it('is honest when a cleaner option adds fossil CO₂', () => {
    expect(LIFESTYLE_SWAPS.find((s) => s.id === 'chulha-lpg')?.co2Kg).toBeLessThan(0);
  });
});
