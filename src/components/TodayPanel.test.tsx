import { render, screen } from '@testing-library/react';
import { computeAqi } from '../core/aqi';
import { DEFAULT_PROFILE } from '../core/defaults';
import type { Outlook } from '../core/forecast';
import { sampleSnapshot } from '../core/sampleAir';
import { TodayPanel } from './TodayPanel';

const snapshot = sampleSnapshot(new Date(2026, 10, 23, 8));
const empty: Outlook = {
  hours: [],
  cleanest: null,
  dirtiest: null,
  ventilate: null,
  exercise: null,
};

describe('TodayPanel', () => {
  it('speaks to sensitive groups generally when nobody vulnerable lives at home', () => {
    render(
      <TodayPanel
        snapshot={snapshot}
        aqi={computeAqi(snapshot.current)}
        outlook={empty}
        profile={{ ...DEFAULT_PROFILE, children: 0, elders: 0, sensitiveMember: false }}
        windowLabel={() => null}
      />,
    );
    expect(screen.getByText('Sensitive groups:')).toBeInTheDocument();
    expect(screen.getAllByText('Not available')).toHaveLength(3);
    expect(
      screen.getByRole('img', { name: 'Hourly PM2.5 for the next 24 hours.' }),
    ).toBeInTheDocument();
  });
});
