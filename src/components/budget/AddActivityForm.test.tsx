import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddActivityForm, createActivity } from './AddActivityForm';

describe('createActivity', () => {
  it('rounds to quarter hours with a minimum length', () => {
    expect(createActivity('jog', 7, 50, 'x')).toMatchObject({
      id: 'x',
      start: 7,
      duration: 0.75,
      setting: 'outdoor-roadside',
    });
    expect(createActivity('park', 7, 1, 'y').duration).toBe(0.25);
  });
});

describe('AddActivityForm', () => {
  it('submits the chosen preset, time and length', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddActivityForm onAdd={onAdd} />);
    await user.selectOptions(screen.getByLabelText('Activity'), 'workout');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Home workout', start: 17, duration: 0.5 }),
    );
  });
});
