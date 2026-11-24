import type { ReactElement } from 'react';
import { formatDose, percent } from '../core/explain';
import type { AqiResult, DayBudget, Swap } from '../core/types';
import type { AirStatus } from '../hooks/useAir';
import { BreathRing } from './BreathRing';

interface HeroProps {
  aqi: AqiResult;
  placeName: string;
  status: AirStatus;
  budget: DayBudget;
  topSwap: Swap | undefined;
  ventilate: string | null;
  onOpenBudget: () => void;
}

const shortPlace = (name: string) => name.replace(/\s*\(sample data\)$/, '');

/** The first thing a family sees: today's air, what their day costs them, and the best fix. */
export function Hero({
  aqi,
  placeName,
  status,
  budget,
  topSwap,
  ventilate,
  onOpenBudget,
}: HeroProps): ReactElement {
  const place = shortPlace(placeName);
  const headline =
    status === 'live'
      ? `The air in ${place} is ${aqi.category.toLowerCase()} right now.`
      : `A ${aqi.category.toLowerCase()} winter day in ${place}, to show how Saans works.`;

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <BreathRing aqi={aqi} />
      <div className="hero-copy">
        <h2 id="hero-heading" className="hero-title">
          {headline}
        </h2>
        <p className="hero-text">
          Your planned day adds up to {formatDose(budget.totalDose)} of PM2.5 in your lungs, roughly{' '}
          {budget.cigarettes.toFixed(1)} cigarettes&apos; worth of smoke.
          {topSwap
            ? ` The biggest single fix: ${topSwap.title.charAt(0).toLowerCase()}${topSwap.title.slice(1)}, which cuts that part of the day by ${percent(topSwap.doseSaved, topSwap.doseBefore)}%.`
            : ' Your routine already avoids the worst of it.'}
        </p>
        <div className="hero-actions">
          <button type="button" className="button" onClick={onOpenBudget}>
            Open my breath budget
          </button>
          {ventilate ? (
            <p className="hero-note">Best time to air out the house: {ventilate}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
