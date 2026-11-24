import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { NumberField, Stat } from './FormFields';

function NumberHarness(): ReactElement {
  const [value, setValue] = useState(10);
  return <NumberField label="Count" value={value} min={0} max={50} onChange={setValue} />;
}

describe('NumberField', () => {
  it('lets people clear and retype, clamps, and restores on blur', async () => {
    const user = userEvent.setup();
    render(<NumberHarness />);
    const input = screen.getByLabelText('Count');
    await user.clear(input);
    expect(input).toHaveValue(null);
    await user.tab();
    expect(input).toHaveValue(10);
    await user.clear(input);
    await user.type(input, '99');
    await user.tab();
    expect(input).toHaveValue(50);
  });
});

describe('Stat', () => {
  it('applies the tone class only when given', () => {
    const { container, rerender } = render(<Stat value="1" label="one" />);
    expect(container.firstChild).toHaveClass('stat');
    expect(container.firstChild).not.toHaveClass('stat-warn');
    rerender(<Stat value="1" label="one" tone="warn" />);
    expect(container.firstChild).toHaveClass('stat-warn');
  });
});
