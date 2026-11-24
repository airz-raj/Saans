import type { ReactElement } from 'react';
import { formatConc, percent } from '../../core/explain';
import type { HomeHack } from '../../core/indoor';

interface HackListProps {
  hacks: readonly HomeHack[];
  onAdopt: (hack: HomeHack) => void;
}

/** Indoor fixes ranked by how much PM2.5 each removes for the chosen moment. */
export function HackList({ hacks, onAdopt }: Readonly<HackListProps>): ReactElement {
  if (hacks.length === 0) return <p>Your room is already well set up for this moment.</p>;
  return (
    <ol className="hack-list">
      {hacks.map((hack) => (
        <li key={hack.id} className="hack">
          <div>
            <strong>{hack.title}</strong>
            <p className="hint">{hack.how}</p>
            <p>
              {formatConc(hack.before)} → <strong>{formatConc(hack.after)}</strong> (−
              {percent(hack.saved, hack.before)}%)
            </p>
          </div>
          <button type="button" className="button secondary" onClick={() => onAdopt(hack)}>
            I did this
          </button>
        </li>
      ))}
    </ol>
  );
}
