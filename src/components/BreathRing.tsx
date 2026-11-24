import type { CSSProperties, ReactElement } from 'react';
import { categoryToken } from '../core/aqi';
import type { AqiResult } from '../core/types';

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Seconds per breath for the ring's animation: calm and slow on clean days, short and
 * laboured as the index climbs. Purely decorative; disabled for reduced-motion users.
 */
export const breathSeconds = (aqi: number): number =>
  Number((6 - 3.4 * Math.min(1, Math.max(0, aqi) / 500)).toFixed(2));

/** The AQI as a ring that "breathes"; the number and category are always written out. */
export function BreathRing({ aqi }: Readonly<{ aqi: AqiResult }>): ReactElement {
  const fraction = Math.min(1, aqi.aqi / 500);
  const style = { '--breath': `${breathSeconds(aqi.aqi)}s` } as CSSProperties;
  return (
    <figure className={`ring aqi-${categoryToken(aqi.category)}`} style={style}>
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Air Quality Index ${aqi.aqi}, ${aqi.category}`}
      >
        <circle cx="100" cy="100" r="66" className="ring-breath" />
        <circle cx="100" cy="100" r={RADIUS} className="ring-track" />
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          className="ring-value"
          strokeDasharray={`${(fraction * CIRCUMFERENCE).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
          transform="rotate(-90 100 100)"
        />
        <text x="100" y="106" textAnchor="middle" className="ring-number">
          {aqi.aqi}
        </text>
        <text x="100" y="132" textAnchor="middle" className="ring-caption">
          AQI (CPCB)
        </text>
      </svg>
      <figcaption className="ring-category">{aqi.category}</figcaption>
    </figure>
  );
}
