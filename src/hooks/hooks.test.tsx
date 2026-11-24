import { act, renderHook, waitFor } from '@testing-library/react';
import { fallbackPlan, type CoachContext } from '../core/coach';
import { sampleSnapshot } from '../core/sampleAir';
import { clearApiCache } from '../services/api';
import { installFetch } from '../testing/fakeFetch';
import { useAir } from './useAir';
import { useCoach } from './useCoach';
import { useDebouncedValue } from './useDebouncedValue';
import { usePersistentState } from './usePersistentState';

beforeEach(() => clearApiCache());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('usePersistentState', () => {
  it('loads through the validator and writes changes back', () => {
    localStorage.setItem('k', JSON.stringify(5));
    const { result } = renderHook(() =>
      usePersistentState('k', (raw) => (typeof raw === 'number' ? raw : 0)),
    );
    expect(result.current[0]).toBe(5);
    act(() => result.current[1](9));
    expect(localStorage.getItem('k')).toBe('9');
  });

  it('falls back when stored data is invalid', () => {
    localStorage.setItem('k', '"not a number"');
    const { result } = renderHook(() =>
      usePersistentState('k', (raw) => (typeof raw === 'number' ? raw : 42)),
    );
    expect(result.current[0]).toBe(42);
  });
});

describe('useDebouncedValue', () => {
  it('only publishes the last value after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    rerender({ value: 'abc' });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('abc');
  });
});

describe('useAir', () => {
  const live = sampleSnapshot();
  const place = { name: 'Pune', lat: 18.52, lon: 73.86 };

  it('shows the sample day until a place is chosen', () => {
    const { result } = renderHook(() => useAir(null));
    expect(result.current.status).toBe('sample');
    expect(result.current.snapshot.source).toBe('sample');
  });

  it('loads live data for a place', async () => {
    installFetch(() => ({
      body: {
        timezone: 'Asia/Kolkata',
        current: live.current,
        hourly: live.hourly,
        fetchedAt: 'now',
      },
    }));
    const { result } = renderHook(() => useAir(place));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('live'));
    expect(result.current.snapshot.place).toBe(place);
  });

  it('reports errors and keeps a usable sample day', async () => {
    installFetch(() => ({
      status: 502,
      body: { error: 'Live air data is unavailable right now' },
    }));
    const { result } = renderHook(() => useAir(place));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.message).toBe('Live air data is unavailable right now');
    expect(result.current.snapshot.hourly.length).toBeGreaterThan(0);
  });

  it('cancels the request when the component goes away', () => {
    const fetchMock = installFetch(() => ({ body: {} }));
    const { unmount } = renderHook(() => useAir(place));
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe('useCoach', () => {
  const context = { place: 'X', aqi: 100 } as CoachContext;

  it('marks Gemini answers and falls back on failure', async () => {
    installFetch(() => ({ body: { result: { headline: 'h', steps: [], caution: 'c' } } }));
    const fallback = vi.fn(() => ({ headline: 'offline', steps: [], caution: '' }));
    const { result } = renderHook(() => useCoach('plan', fallback));
    await act(() => result.current[1](context, 'en'));
    expect(result.current[0]).toMatchObject({
      status: 'done',
      source: 'gemini',
      result: { headline: 'h' },
    });

    clearApiCache();
    installFetch(() => ({ status: 503, body: { fallback: true } }));
    await act(() => result.current[1]({ ...context, aqi: 101 }, 'hi'));
    expect(result.current[0]).toMatchObject({ source: 'offline', result: { headline: 'offline' } });
    expect(fallback).toHaveBeenCalledWith(expect.objectContaining({ aqi: 101 }), 'hi');
  });

  it('accepts the real fallback functions', () => {
    const { result } = renderHook(() => useCoach('plan', fallbackPlan));
    expect(result.current[0].status).toBe('idle');
  });
});
