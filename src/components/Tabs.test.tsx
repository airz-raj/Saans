import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { panelId, tabId, Tabs } from './Tabs';

const tabs = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
] as const;

describe('Tabs', () => {
  it('wraps with the arrow keys and ignores other keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} label="Demo" />);
    await user.click(screen.getByRole('tab', { name: 'A' }));
    onChange.mockClear();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    onChange.mockClear();
    await user.keyboard('x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('links each tab to its panel', () => {
    render(<Tabs tabs={tabs} active="b" onChange={() => undefined} label="Demo" />);
    const tab = screen.getByRole('tab', { name: 'B' });
    expect(tab).toHaveAttribute('id', tabId('b'));
    expect(tab).toHaveAttribute('aria-controls', panelId('b'));
    expect(tab).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('tabindex', '-1');
  });
});
