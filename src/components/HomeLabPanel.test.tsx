import { DEFAULT_ROOM } from '../core/defaults';
import type { HomeHack } from '../core/indoor';
import { adoptHack } from './HomeLabPanel';

describe('adoptHack', () => {
  it('patches the room and adds any portable cleaner to the CADR', () => {
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
});
