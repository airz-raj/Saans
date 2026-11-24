import { render, screen } from '@testing-library/react';
import { computeAqi } from '../core/aqi';
import { DEFAULT_PROFILE } from '../core/defaults';
import type { Outlook } from '../core/forecast';
import { sampleSnapshot } from '../core/sampleAir';
import { HourlyChart } from './HourlyChart';
import { StatusBanner } from './StatusBanner';
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

describe('HourlyChart', () => {
  it('renders without a highlighted window', () => {
    const { container } = render(
      <HourlyChart hours={snapshot.hourly.slice(0, 6)} highlight={null} summary="Six hours" />,
    );
    expect(container.querySelector('.chart-highlight')).toBeNull();
    expect(container.querySelectorAll('.bar')).toHaveLength(6);
  });
});

describe('StatusBanner', () => {
  it('omits the time when the fetch time is unreadable', () => {
    render(
      <StatusBanner air={{ status: 'live', snapshot: { ...snapshot, fetchedAt: 'not a date' } }} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/updated\s*$/);
  });

  it('describes loading and errors', () => {
    const { rerender } = render(<StatusBanner air={{ status: 'loading', snapshot }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Fetching live air data');
    rerender(<StatusBanner air={{ status: 'error', snapshot }} />);
    expect(screen.getByRole('status')).toHaveTextContent('network error');
  });
});
