import { useEffect, useMemo, useState } from 'react';
import { sampleSnapshot } from '../core/sampleAir';
import type { AirSnapshot, Place } from '../core/types';
import { fetchAir } from '../services/api';

export type AirStatus = 'sample' | 'loading' | 'live' | 'error';

export interface AirState {
  snapshot: AirSnapshot;
  status: AirStatus;
  message?: string;
}

interface Result {
  key: string;
  snapshot?: AirSnapshot;
  error?: string;
}

/** Places within ~1 km share a key, matching the server's coordinate rounding. */
const placeKey = (place: Place): string => `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;

/**
 * Live air data for the chosen place. Falls back to a realistic sample day so every screen
 * stays useful offline or before a location is chosen. Stale requests are aborted.
 */
export function useAir(place: Place | null): AirState {
  const key = place ? placeKey(place) : '';
  const sample = useMemo(() => sampleSnapshot(), []);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!place) return undefined;
    const controller = new AbortController();
    fetchAir(place, controller.signal).then(
      (snapshot) => setResult({ key, snapshot }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key, error: error instanceof Error ? error.message : 'Live data unavailable' });
      },
    );
    return () => controller.abort();
  }, [key, place]);

  if (!place) return { snapshot: sample, status: 'sample' };
  const settled = result?.key === key ? result : null;
  if (!settled) return { snapshot: result?.snapshot ?? sample, status: 'loading' };
  if (settled.error || !settled.snapshot) {
    return { snapshot: sample, status: 'error', message: settled.error ?? 'Live data unavailable' };
  }
  return { snapshot: settled.snapshot, status: 'live' };
}
