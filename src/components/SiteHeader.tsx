import type { ReactElement } from 'react';
import type { Place } from '../core/types';
import { LocationPicker } from './LocationPicker';

interface SiteHeaderProps {
  place: Place | null;
  onSelectPlace: (place: Place) => void;
}

export function SiteHeader({ place, onSelectPlace }: Readonly<SiteHeaderProps>): ReactElement {
  return (
    <header className="site-header">
      <div className="brand">
        <svg viewBox="0 0 64 64" aria-hidden="true" className="brand-mark">
          <path d="M10 38c7-11 16-11 21-4s15 7 23-4" />
          <path d="M10 26c7-11 16-11 21-4s15 7 23-4" />
        </svg>
        <div>
          <h1>Saans</h1>
          <p className="tagline">
            See the air your family breathes. Change the day, not just the mask.
          </p>
        </div>
      </div>
      <LocationPicker current={place} onSelect={onSelectPlace} />
    </header>
  );
}
