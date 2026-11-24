import type { ReactElement } from 'react';
import { categoryFor, subIndex } from '../../core/aqi';
import { formatConc, percent } from '../../core/explain';
import { Stat } from '../FormFields';

interface IndoorReadoutProps {
  indoor: number;
  outdoor: number;
}

/** Indoor vs outdoor PM2.5 as numbers and proportional bars. */
export function IndoorReadout({ indoor, outdoor }: Readonly<IndoorReadoutProps>): ReactElement {
  const scale = Math.max(indoor, outdoor, 1);
  const dirtierInside = indoor > outdoor;
  return (
    <>
      <div className="stats" aria-live="polite">
        <Stat
          value={formatConc(indoor)}
          label={`indoors · ${categoryFor(subIndex('pm2_5', indoor) ?? 0)}`}
        />
        <Stat value={formatConc(outdoor)} label="outdoors now" />
        <Stat
          value={`${percent(indoor, outdoor)}%`}
          label="of outdoor level"
          tone={dirtierInside ? 'warn' : 'good'}
        />
      </div>
      <div className="compare" aria-hidden="true">
        <div className="compare-row">
          <span>Indoor</span>
          <span className="compare-bar indoor" style={{ width: `${(indoor / scale) * 100}%` }} />
        </div>
        <div className="compare-row">
          <span>Outdoor</span>
          <span className="compare-bar outdoor" style={{ width: `${(outdoor / scale) * 100}%` }} />
        </div>
      </div>
      {dirtierInside ? (
        <p className="callout">
          Indoor sources make this room dirtier than the street right now. The fixes below help
          most.
        </p>
      ) : null}
    </>
  );
}
