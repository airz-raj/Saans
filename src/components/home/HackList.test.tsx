import { render, screen } from '@testing-library/react';
import { HackList } from './HackList';

describe('HackList', () => {
  it('says so when the room needs no fixes', () => {
    render(<HackList hacks={[]} onAdopt={() => undefined} />);
    expect(screen.getByText(/already well set up/)).toBeInTheDocument();
  });
});
