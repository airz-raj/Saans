import { render, screen } from '@testing-library/react';
import { flatExposure, makeSwap } from '../../testing/fixtures';
import { signed, SwapList } from './SwapList';

describe('SwapList', () => {
  it('shows extra emissions as a warning and longer trips as positive minutes', () => {
    render(<SwapList swaps={[makeSwap()]} exposure={flatExposure} onApply={() => undefined} />);
    expect(screen.getByText('+0.50 kg CO₂')).toHaveClass('chip-warn');
    expect(screen.getByText('+12 min')).toBeInTheDocument();
    expect(screen.getByText('−60% dose')).toBeInTheDocument();
  });

  it('hides chips for negligible changes and says when there is nothing to fix', () => {
    const quiet = makeSwap({ co2Saved: 0.001, minutesDelta: 0 });
    const { rerender } = render(
      <SwapList swaps={[quiet]} exposure={flatExposure} onApply={() => undefined} />,
    );
    expect(screen.queryByText(/kg CO₂/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
    rerender(<SwapList swaps={[]} exposure={flatExposure} onApply={() => undefined} />);
    expect(screen.getByText(/already well planned/)).toBeInTheDocument();
  });
});

describe('signed', () => {
  it.each([
    [12, 0, '+12'],
    [-0.5, 2, '−0.50'],
    [0, 0, '0'],
  ])('formats %d with %d digits as %s', (value, digits, expected) => {
    expect(signed(value, digits)).toBe(expected);
  });
});
