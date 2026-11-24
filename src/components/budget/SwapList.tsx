import { useState, type ReactElement } from 'react';
import { explainSwap, formatDose, percent } from '../../core/explain';
import type { ExposureContext } from '../../core/exposure';
import type { Swap } from '../../core/types';

/** Changes smaller than this (kg CO₂) are not worth a chip. */
const CO2_CHIP_THRESHOLD = 0.01;

const signed = (value: number, digits = 0): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`;

function ImpactChips({ swap }: { swap: Swap }): ReactElement {
  return (
    <ul className="chips" aria-label="Impact">
      <li className="chip chip-good">−{percent(swap.doseSaved, swap.doseBefore)}% dose</li>
      {Math.abs(swap.co2Saved) >= CO2_CHIP_THRESHOLD ? (
        <li className={`chip ${swap.co2Saved > 0 ? 'chip-good' : 'chip-warn'}`}>
          {signed(-swap.co2Saved, 2)} kg CO₂
        </li>
      ) : null}
      {swap.minutesDelta !== 0 ? <li className="chip">{signed(swap.minutesDelta)} min</li> : null}
    </ul>
  );
}

interface SwapListProps {
  swaps: readonly Swap[];
  exposure: ExposureContext;
  onApply: (swap: Swap) => void;
}

/** Ranked suggestions; applying one announces the saving to screen readers. */
export function SwapList({ swaps, exposure, onApply }: SwapListProps): ReactElement {
  const [announcement, setAnnouncement] = useState('');

  const apply = (swap: Swap) => {
    onApply(swap);
    setAnnouncement(`Applied: ${swap.title}. Saves about ${formatDose(swap.doseSaved)}.`);
  };

  return (
    <section className="card" aria-labelledby="swaps-heading">
      <h2 id="swaps-heading">Swaps that cut your dose</h2>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
      {swaps.length === 0 ? (
        <p>Your day is already well planned for today&apos;s air.</p>
      ) : (
        <ol className="swap-list">
          {swaps.map((swap) => (
            <li key={swap.id} className="swap">
              <h3>{swap.title}</h3>
              <p>{explainSwap(swap, exposure)}</p>
              <ImpactChips swap={swap} />
              <button type="button" className="button" onClick={() => apply(swap)}>
                Apply to my day
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
