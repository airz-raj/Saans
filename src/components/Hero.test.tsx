import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAqi } from '../core/aqi';
import { DEFAULT_PROFILE } from '../core/defaults';
import { dayBudget } from '../core/exposure';
import { dayPm25 } from '../core/forecast';
import { suggestSwaps } from '../core/optimizer';
import { buildDefaultPlan } from '../core/plan';
import { sampleSnapshot } from '../core/sampleAir';
import { breathSeconds } from './BreathRing';
import { Hero } from './Hero';

const snapshot = sampleSnapshot(new Date(2026, 10, 23, 8));
const ctx = { pm25: dayPm25(snapshot, 0), room: DEFAULT_PROFILE.room, persona: 'adult' as const };
const plan = buildDefaultPlan(DEFAULT_PROFILE);

describe('Hero', () => {
  it('summarises live air, the day’s dose and the biggest fix', async () => {
    const onOpenBudget = vi.fn();
    render(
      <Hero
        aqi={computeAqi(snapshot.current)}
        placeName="Mānesar"
        status="live"
        budget={dayBudget(plan, ctx)}
        topSwap={suggestSwaps(plan, ctx)[0]}
        ventilate="2 PM–3 PM"
        onOpenBudget={onOpenBudget}
      />,
    );
    expect(screen.getByRole('heading', { name: /The air in Mānesar is/ })).toBeInTheDocument();
    expect(screen.getByText(/cigarettes' worth of smoke/)).toHaveTextContent(
      /The biggest single fix/,
    );
    expect(screen.getByText('Best time to air out the house: 2 PM–3 PM')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open my breath budget' }));
    expect(onOpenBudget).toHaveBeenCalledOnce();
  });

  it('explains sample data and handles a day with nothing to fix', () => {
    render(
      <Hero
        aqi={computeAqi({ ...snapshot.current, pm2_5: 10, pm10: 10, no2: 5, co: 100 })}
        placeName="New Delhi (sample data)"
        status="sample"
        budget={dayBudget([], ctx)}
        topSwap={undefined}
        ventilate={null}
        onOpenBudget={() => undefined}
      />,
    );
    expect(
      screen.getByRole('heading', {
        name: /good winter day in New Delhi, to show how Saans works/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/already avoids the worst/)).toBeInTheDocument();
  });

  it('breathes faster as the air gets worse', () => {
    expect(breathSeconds(0)).toBe(6);
    expect(breathSeconds(500)).toBe(2.6);
    expect(breathSeconds(900)).toBe(2.6);
    expect(breathSeconds(250)).toBeGreaterThan(breathSeconds(400));
  });
});
