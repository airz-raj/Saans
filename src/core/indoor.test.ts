import { DEFAULT_ROOM } from './defaults';
import { indoorConcentration, rankHomeHacks, roomVolume, sourceStrength } from './indoor';
import type { RoomSetup } from './types';

const quiet: RoomSetup = {
  ...DEFAULT_ROOM,
  incense: false,
  mosquitoCoil: false,
  smoking: false,
  purifierCadr: 0,
};

describe('indoorConcentration', () => {
  it('applies the steady-state mass balance', () => {
    // P=0.8, a=0.9, k=0.2 → 0.8·0.9·200 / 1.1
    expect(indoorConcentration(quiet, 200)).toBeCloseTo(130.9, 1);
  });

  it('is zero with clean outdoor air and no sources', () => {
    expect(indoorConcentration(quiet, 0)).toBe(0);
  });

  it('rises with open windows and falls with a purifier', () => {
    const base = indoorConcentration(quiet, 200);
    expect(indoorConcentration({ ...quiet, windows: 'open' }, 200)).toBeGreaterThan(base);
    expect(indoorConcentration({ ...quiet, purifierCadr: 300 }, 200)).toBeLessThan(base / 3);
    expect(indoorConcentration(quiet, 200, {}, 250)).toBeLessThan(base / 3);
  });

  it('adds indoor sources only when they are present and active', () => {
    const withIncense = { ...quiet, incense: true };
    expect(indoorConcentration(withIncense, 100, {})).toBeCloseTo(indoorConcentration(quiet, 100));
    expect(indoorConcentration(withIncense, 100, { incense: true })).toBeGreaterThan(
      indoorConcentration(quiet, 100) + 100,
    );
  });

  it('lets the kitchen exhaust capture most cooking smoke', () => {
    const lpg = { ...quiet, cookingFuel: 'lpg' as const };
    expect(sourceStrength({ ...lpg, kitchenExhaust: true }, { cooking: true })).toBeCloseTo(
      sourceStrength(lpg, { cooking: true }) * 0.4,
    );
  });

  it('guards against degenerate room sizes', () => {
    expect(roomVolume({ areaM2: 0, ceilingM: 0 })).toBe(1);
  });
});

describe('rankHomeHacks', () => {
  it('returns hacks sorted by benefit, each with a real improvement', () => {
    const hacks = rankHomeHacks({ ...quiet, windows: 'open' }, 250, 'evening');
    expect(hacks.length).toBeGreaterThan(1);
    hacks.forEach((hack) => expect(hack.after).toBeLessThan(hack.before));
    const saved = hacks.map((h) => h.saved);
    expect([...saved].sort((a, b) => b - a)).toEqual(saved);
    expect(hacks.map((h) => h.id)).toContain('close-windows');
  });

  it('puts removing a mosquito coil first at bedtime', () => {
    const hacks = rankHomeHacks({ ...quiet, mosquitoCoil: true }, 200, 'sleeping');
    expect(hacks[0]?.id).toBe('no-coil');
  });

  it('only offers cooking hacks for the cooking moment', () => {
    const room = { ...quiet, cookingFuel: 'biomass' as const };
    expect(rankHomeHacks(room, 200, 'cooking').map((h) => h.id)).toEqual(
      expect.arrayContaining(['kitchen-exhaust', 'switch-biomass']),
    );
    expect(rankHomeHacks(room, 200, 'evening').map((h) => h.id)).not.toContain('switch-biomass');
  });

  it('does not suggest closing windows that are already closed', () => {
    expect(rankHomeHacks(quiet, 200, 'evening').map((h) => h.id)).not.toContain('close-windows');
  });
});

describe('source duty cycles', () => {
  it('scales a source by the share of time it burns', () => {
    const room = { ...quiet, incense: true };
    expect(sourceStrength(room, { incense: 0.5 })).toBeCloseTo(
      sourceStrength(room, { incense: true }) / 2,
    );
    expect(sourceStrength(room, { incense: 7 })).toBeCloseTo(sourceStrength(room, { incense: 1 }));
    expect(sourceStrength(room, { incense: false })).toBe(0);
  });
});
