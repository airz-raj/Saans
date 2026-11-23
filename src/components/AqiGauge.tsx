import { categoryToken } from '../core/aqi';
import type { AqiResult } from '../core/types';

/** Semi-circular gauge; the category is always written out so colour is never the only cue. */
export function AqiGauge({ aqi }: { aqi: AqiResult }) {
  const fraction = Math.min(1, aqi.aqi / 500);
  const angle = Math.PI * (1 - fraction);
  const x = 100 + 80 * Math.cos(angle);
  const y = 100 - 80 * Math.sin(angle);
  const largeArc = 0;
  return (
    <figure className={`gauge aqi-${categoryToken(aqi.category)}`}>
      <svg
        viewBox="0 0 200 115"
        role="img"
        aria-label={`Air Quality Index ${aqi.aqi}, ${aqi.category}`}
      >
        <path d="M20 100 A80 80 0 0 1 180 100" className="gauge-track" />
        {aqi.aqi > 0 ? (
          <path
            d={`M20 100 A80 80 0 ${largeArc} 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
            className="gauge-value"
          />
        ) : null}
        <text x="100" y="88" textAnchor="middle" className="gauge-number">
          {aqi.aqi}
        </text>
        <text x="100" y="108" textAnchor="middle" className="gauge-caption">
          CPCB AQI
        </text>
      </svg>
      <figcaption className="gauge-category">{aqi.category}</figcaption>
    </figure>
  );
}
