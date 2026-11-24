import { render } from '@testing-library/react';
import { sampleSnapshot } from '../core/sampleAir';
import { HourlyChart } from './HourlyChart';

describe('HourlyChart', () => {
  it('renders one bar per hour and no highlight when there is no window', () => {
    const hours = sampleSnapshot(new Date(2026, 10, 23, 8)).hourly.slice(0, 6);
    const { container } = render(
      <HourlyChart hours={hours} highlight={null} summary="Six hours" />,
    );
    expect(container.querySelector('.chart-highlight')).toBeNull();
    expect(container.querySelectorAll('.bar')).toHaveLength(6);
  });
});
