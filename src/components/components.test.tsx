import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { DEFAULT_ROOM } from '../core/defaults';
import type { HomeHack } from '../core/indoor';
import type { Activity, Swap } from '../core/types';
import { createActivity } from './budget/AddActivityForm';
import { describeActivity } from './budget/DayTimeline';
import { SwapList } from './budget/SwapList';
import { shareAdvisory } from './coach/AdvisoryCard';
import { SourceBadge } from './coach/SourceBadge';
import { NumberField } from './fields';
import { HackList } from './home/HackList';
import { IndoorReadout } from './home/IndoorReadout';
import { adoptHack } from './HomeLabPanel';
import { SwapsPanel } from './SwapsPanel';
import { Tabs } from './Tabs';
import { DEFAULT_PROFILE } from '../core/defaults';

const exposure = {
  pm25: Array.from({ length: 24 }, () => 200),
  room: DEFAULT_ROOM,
  persona: 'adult' as const,
};
const activity: Activity = {
  id: 'commute',
  label: 'Commute',
  kind: 'commute',
  start: 9,
  duration: 0.5,
  setting: 'transit',
  effort: 'rest',
  mode: 'metro',
  distanceKm: 8,
};

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

describe('Tabs', () => {
  const tabs = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ] as const;

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
});

describe('SwapList', () => {
  const swap = (patch: Partial<Swap>): Swap => ({
    id: 's',
    kind: 'mode',
    activityId: 'commute',
    title: 'Take the car (AC on recirculation) for “Commute”',
    before: activity,
    after: { ...activity, mode: 'car-ac' },
    doseBefore: 100,
    doseAfter: 40,
    doseSaved: 60,
    co2Saved: -0.5,
    minutesDelta: 12,
    ...patch,
  });

  it('shows extra emissions as a warning and longer trips as positive minutes', () => {
    render(<SwapList swaps={[swap({})]} exposure={exposure} onApply={() => undefined} />);
    expect(screen.getByText('+0.50 kg CO₂')).toHaveClass('chip-warn');
    expect(screen.getByText('+12 min')).toBeInTheDocument();
    expect(screen.getByText('−60% dose')).toBeInTheDocument();
  });

  it('hides chips for negligible changes and says when there is nothing to fix', () => {
    const { rerender } = render(
      <SwapList
        swaps={[swap({ co2Saved: 0.001, minutesDelta: 0 })]}
        exposure={exposure}
        onApply={() => undefined}
      />,
    );
    expect(screen.queryByText(/kg CO₂/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
    rerender(<SwapList swaps={[]} exposure={exposure} onApply={() => undefined} />);
    expect(screen.getByText(/already well planned/)).toBeInTheDocument();
  });
});

describe('small pieces', () => {
  it('describes where an activity happens', () => {
    expect(describeActivity(activity)).toBe('Metro');
    expect(describeActivity({ ...activity, setting: 'outdoor-green', mode: undefined })).toBe(
      'Park / green area',
    );
  });

  it('creates activities rounded to quarter hours with a minimum length', () => {
    expect(createActivity('jog', 7, 50, 'x')).toMatchObject({
      id: 'x',
      start: 7,
      duration: 0.75,
      setting: 'outdoor-roadside',
    });
    expect(createActivity('park', 7, 1, 'y').duration).toBe(0.25);
  });

  it('adopts a hack by patching the room and adding cleaner capacity', () => {
    const hack: HomeHack = {
      id: 'h',
      title: 't',
      how: '',
      before: 1,
      after: 0,
      saved: 1,
      patch: { windows: 'sealed' },
      extraCadr: 250,
    };
    expect(adoptHack({ ...DEFAULT_ROOM, purifierCadr: 100 }, hack)).toMatchObject({
      windows: 'sealed',
      purifierCadr: 350,
    });
  });

  it('flags rooms that are dirtier than the street', () => {
    const { rerender } = render(<IndoorReadout indoor={300} outdoor={100} />);
    expect(screen.getByText(/dirtier than the street/)).toBeInTheDocument();
    rerender(<IndoorReadout indoor={30} outdoor={100} />);
    expect(screen.queryByText(/dirtier than the street/)).not.toBeInTheDocument();
  });

  it('handles an empty hack list and an unknown source', () => {
    render(<HackList hacks={[]} onAdopt={() => undefined} />);
    expect(screen.getByText(/already well set up/)).toBeInTheDocument();
    const { container } = render(<SourceBadge source={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists general swaps for a household without a commute', () => {
    render(<SwapsPanel profile={{ ...DEFAULT_PROFILE, commuteMode: 'none' }} />);
    expect(screen.queryByText(/Daily .* commute/)).not.toBeInTheDocument();
    expect(screen.getByText(/Burning dry leaves/)).toBeInTheDocument();
  });
});

describe('shareAdvisory', () => {
  const item = { title: 'Title', message: 'Message' };
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('prefers the native share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await expect(shareAdvisory(item)).resolves.toBe('Shared.');
    expect(share).toHaveBeenCalledWith({ title: 'Title', text: 'Title\n\nMessage' });
  });

  it('copies when sharing is unavailable, and explains when both fail', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await expect(shareAdvisory(item)).resolves.toMatch(/Copied/);
    writeText.mockRejectedValueOnce(new Error('denied'));
    await expect(shareAdvisory(item)).resolves.toMatch(/Could not share/);
  });
});
