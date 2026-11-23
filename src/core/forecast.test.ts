import { currentIndex, dayPm25, extremeWindow, formatHour, outlook, pointHour } from './forecast';
import { sampleSnapshot } from './sampleAir';

const NOW = new Date(2026, 10, 23, 8, 15); // 23 Nov 2026, 08:15 local

describe('extremeWindow', () => {
  const series = [50, 40, 10, 20, 90, 80];

  it('finds the cleanest and dirtiest windows', () => {
    expect(extremeWindow(series, 2, 'min')).toEqual({ index: 2, length: 2, average: 15 });
    expect(extremeWindow(series, 2, 'max')).toEqual({ index: 4, length: 2, average: 85 });
  });

  it('respects the allowed-hours filter', () => {
    expect(extremeWindow(series, 1, 'min', (i) => i !== 2)?.index).toBe(3);
  });

  it('returns null when no window fits', () => {
    expect(extremeWindow(series, 10)).toBeNull();
    expect(extremeWindow(series, 1, 'min', () => false)).toBeNull();
  });
});

describe('outlook', () => {
  const snapshot = sampleSnapshot(NOW);

  it('starts at the current hour', () => {
    expect(currentIndex(snapshot)).toBe(8);
    const result = outlook(snapshot);
    expect(result.hours).toHaveLength(24);
    expect(result.hours[0]?.time.endsWith('08:00')).toBe(true);
  });

  it('finds the afternoon clean window in a winter smog day', () => {
    const result = outlook(snapshot);
    const ventilate = result.ventilate && result.hours[result.ventilate.index];
    expect(ventilate && pointHour(ventilate)).toBe(14);
    expect(result.cleanest?.average).toBeLessThan(result.dirtiest?.average ?? 0);
  });

  it('keeps exercise suggestions within waking daytime hours', () => {
    const result = outlook(snapshot);
    const hour = result.exercise ? pointHour(result.hours[result.exercise.index]!) : -1;
    expect(hour).toBeGreaterThanOrEqual(6);
    expect(hour).toBeLessThanOrEqual(19);
  });

  it('falls back to index 0 when the current hour is missing', () => {
    expect(
      currentIndex({ ...snapshot, current: { ...snapshot.current, time: '1999-01-01T00:00' } }),
    ).toBe(0);
  });
});

describe('dayPm25', () => {
  it('returns 24 values for today and tomorrow', () => {
    const snapshot = sampleSnapshot(NOW);
    expect(dayPm25(snapshot, 0)).toHaveLength(24);
    expect(dayPm25(snapshot, 1)[0]).toBeLessThan(dayPm25(snapshot, 0)[0] ?? 0);
  });

  it('pads short series instead of failing', () => {
    const snapshot = sampleSnapshot(NOW);
    const short = { ...snapshot, hourly: snapshot.hourly.slice(0, 3) };
    expect(dayPm25(short, 0)).toHaveLength(24);
    expect(dayPm25({ ...snapshot, hourly: [] }, 1).every((v) => v === snapshot.current.pm2_5)).toBe(
      true,
    );
  });
});

describe('formatHour', () => {
  it.each([
    [0, '12 AM'],
    [7, '7 AM'],
    [12, '12 PM'],
    [13.5, '1:30 PM'],
    [23.75, '11:45 PM'],
    [24, '12 AM'],
  ])('formats %d as %s', (hour, text) => {
    expect(formatHour(hour)).toBe(text);
  });
});
