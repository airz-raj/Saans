import { useEffect, useId, useState, type ReactElement } from 'react';
import type { Place } from '../core/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { searchPlaces } from '../services/api';

interface LocationPickerProps {
  current: Place | null;
  onSelect: (place: Place) => void;
}

const QUERY_PATTERN = /^[\p{L}\p{M}\s.,'-]{2,60}$/u;

/** Screen-reader message describing where the place search has got to. */
export function searchStatus(
  valid: boolean,
  fresh: boolean,
  error: string | undefined,
  count: number,
): string {
  if (!valid) return '';
  if (!fresh) return 'Searching…';
  if (error) return error;
  return count === 0 ? 'No places found.' : `${count} places found.`;
}

interface SearchState {
  query: string;
  results: Place[];
  error?: string;
}

export function LocationPicker({ current, onSelect }: Readonly<LocationPickerProps>): ReactElement {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>({ query: '', results: [] });
  const [geoMessage, setGeoMessage] = useState('');
  const debounced = useDebouncedValue(query.trim(), 400);
  const valid = QUERY_PATTERN.test(debounced);

  useEffect(() => {
    if (!valid) return undefined;
    const controller = new AbortController();
    searchPlaces(debounced, controller.signal).then(
      (results) => setSearch({ query: debounced, results }),
      () => {
        if (!controller.signal.aborted)
          setSearch({ query: debounced, results: [], error: 'Search is unavailable right now.' });
      },
    );
    return () => controller.abort();
  }, [debounced, valid]);

  const fresh = valid && search.query === debounced;
  const results = fresh ? search.results : [];
  const status = searchStatus(valid, fresh, search.error, results.length);

  const choose = (place: Place) => {
    onSelect(place);
    setQuery('');
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoMessage('Location is not available in this browser.');
      return;
    }
    setGeoMessage('Finding you…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeoMessage('');
        choose({
          name: 'My location',
          lat: Math.round(coords.latitude * 100) / 100,
          lon: Math.round(coords.longitude * 100) / 100,
        });
      },
      () => setGeoMessage('Permission denied — search for your city instead.'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  };

  return (
    <div className="location">
      <p className="location-current">
        <span className="muted">Location:</span>{' '}
        <strong>{current ? current.name : 'Not set (showing sample day)'}</strong>
        {current?.admin ? <span className="muted">, {current.admin}</span> : null}
      </p>
      <div className="location-search">
        <label htmlFor={inputId} className="visually-hidden">
          Search city or locality
        </label>
        <input
          id={inputId}
          type="search"
          placeholder="Search city or locality"
          autoComplete="off"
          value={query}
          maxLength={60}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="button secondary" onClick={useMyLocation}>
          Use my location
        </button>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {status || geoMessage}
      </p>
      {geoMessage ? <p className="hint">{geoMessage}</p> : null}
      {results.length > 0 ? (
        <ul className="location-results" aria-label="Matching places">
          {results.map((place) => (
            <li key={`${place.lat},${place.lon}`}>
              <button type="button" className="link-button" onClick={() => choose(place)}>
                {place.name}
                {place.admin ? `, ${place.admin}` : ''}
                {place.country ? ` · ${place.country}` : ''}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
