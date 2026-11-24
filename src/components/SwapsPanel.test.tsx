import { render, screen } from '@testing-library/react';
import { DEFAULT_PROFILE } from '../core/defaults';
import { SwapsPanel } from './SwapsPanel';

describe('SwapsPanel', () => {
  it('lists general swaps for a household without a commute', () => {
    render(<SwapsPanel profile={{ ...DEFAULT_PROFILE, commuteMode: 'none' }} />);
    expect(screen.queryByText(/Daily .* commute/)).not.toBeInTheDocument();
    expect(screen.getByText(/Burning dry leaves/)).toBeInTheDocument();
  });

  it('puts the household commute first when a cleaner mode exists', () => {
    render(<SwapsPanel profile={DEFAULT_PROFILE} />);
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(/Daily two-wheeler commute/);
  });
});
