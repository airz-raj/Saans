import { render, screen } from '@testing-library/react';
import { sampleSnapshot } from '../core/sampleAir';
import { StatusBanner } from './StatusBanner';

const snapshot = sampleSnapshot(new Date(2026, 10, 23, 8));

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
