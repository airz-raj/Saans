import { render, screen } from '@testing-library/react';
import { IndoorReadout } from './IndoorReadout';

describe('IndoorReadout', () => {
  it('flags rooms that are dirtier than the street', () => {
    const { rerender } = render(<IndoorReadout indoor={300} outdoor={100} />);
    expect(screen.getByText(/dirtier than the street/)).toBeInTheDocument();
    rerender(<IndoorReadout indoor={30} outdoor={100} />);
    expect(screen.queryByText(/dirtier than the street/)).not.toBeInTheDocument();
  });
});
