import { useMemo, useState, type ReactElement } from 'react';
import {
  householdSwaps,
  PM_PER_CIGARETTE_G,
  scaleImpact,
  SMOG_SEASON_WEEKS,
  TREE_CO2_PER_WEEK_KG,
  weeklyImpact,
  type Emission,
  type LifestyleSwap,
} from '../core/emissions';
import type { Profile } from '../core/types';
import { NumberField, Stat } from './fields';

const kg = (value: number) => `${value >= 100 ? Math.round(value) : value.toFixed(1)} kg`;
const grams = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)} kg` : `${Math.round(value)} g`;

function Totals({ title, impact }: { title: string; impact: Emission }) {
  return (
    <div className="totals">
      <h3>{title}</h3>
      <div className="stats">
        <Stat
          value={grams(impact.pmG)}
          label={`PM2.5 not released ≈ ${Math.round(impact.pmG / PM_PER_CIGARETTE_G).toLocaleString('en-IN')} cigarettes' smoke`}
          tone="good"
        />
        <Stat
          value={kg(impact.co2Kg)}
          label={
            impact.co2Kg >= 0
              ? `CO₂ avoided ≈ ${Math.round(impact.co2Kg / TREE_CO2_PER_WEEK_KG).toLocaleString('en-IN')} tree-weeks`
              : 'extra fossil CO₂'
          }
          tone={impact.co2Kg >= 0 ? 'good' : 'warn'}
        />
      </div>
    </div>
  );
}

export function SwapsPanel({ profile }: { profile: Profile }): ReactElement {
  const swaps = useMemo(
    () => householdSwaps(profile.commuteMode, profile.commuteKm),
    [profile.commuteMode, profile.commuteKm],
  );

  const [perWeek, setPerWeek] = useState<Record<string, number>>({});
  const [households, setHouseholds] = useState(200);
  const frequency = (swap: LifestyleSwap) => perWeek[swap.id] ?? swap.defaultPerWeek;

  const weekly = useMemo(
    () =>
      weeklyImpact(
        swaps.map((swap) => ({ swap, perWeek: perWeek[swap.id] ?? swap.defaultPerWeek })),
      ),
    [swaps, perWeek],
  );

  return (
    <div className="grid">
      <section className="card span-2" aria-labelledby="exhale-heading">
        <h2 id="exhale-heading">Exhale ledger — what your home adds to the city&apos;s air</h2>
        <p className="hint">
          Set how often each swap could happen in a typical winter week. Figures are indicative
          emission factors for Indian cities.
        </p>
        <ul className="ledger">
          {swaps.map((swap) => (
            <li key={swap.id} className="ledger-item">
              <div>
                <p>
                  <span className="muted">Instead of</span> {swap.from}
                </p>
                <p>
                  <span className="muted">try</span> <strong>{swap.to}</strong>
                </p>
                <p className="hint">
                  {swap.unit}: −{grams(swap.pmG)} PM2.5, {swap.co2Kg >= 0 ? '−' : '+'}
                  {kg(Math.abs(swap.co2Kg))} CO₂. {swap.note}
                </p>
              </div>
              <NumberField
                label="Times a week"
                value={frequency(swap)}
                min={0}
                max={21}
                onChange={(value) => setPerWeek((current) => ({ ...current, [swap.id]: value }))}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="family-impact-heading">
        <h2 id="family-impact-heading">Your family&apos;s impact</h2>
        <div aria-live="polite">
          <Totals title="Every week" impact={weekly} />
          <Totals
            title={`Across the ${SMOG_SEASON_WEEKS}-week smog season`}
            impact={scaleImpact(weekly, 1, SMOG_SEASON_WEEKS)}
          />
        </div>
      </section>

      <section className="card" aria-labelledby="community-heading">
        <h2 id="community-heading">If your community joins in</h2>
        <NumberField
          label="Homes in your society, street or school"
          value={households}
          min={1}
          max={5000}
          step={10}
          onChange={setHouseholds}
        />
        <div aria-live="polite">
          <Totals
            title="Together, this season"
            impact={scaleImpact(weekly, households, SMOG_SEASON_WEEKS)}
          />
        </div>
        <p className="hint">
          Use the Ask Saans tab to turn this into a ready-to-send advisory for your group.
        </p>
      </section>
    </div>
  );
}
