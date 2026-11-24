import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;
function Flaky(): ReactElement {
  if (shouldThrow) throw new Error('boom');
  return <p>Recovered</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('contains a failing section and lets the person retry', async () => {
    shouldThrow = true;
    render(
      <ErrorBoundary section="Breath budget">
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Breath budget could not be shown');
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('renders children untouched when nothing fails', () => {
    render(
      <ErrorBoundary section="Today">
        <p>Fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});
