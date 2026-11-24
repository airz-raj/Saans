import { searchStatus } from './LocationPicker';

describe('searchStatus', () => {
  it.each([
    [false, false, undefined, 0, ''],
    [true, false, undefined, 0, 'Searching…'],
    [true, true, 'Search is unavailable right now.', 0, 'Search is unavailable right now.'],
    [true, true, undefined, 0, 'No places found.'],
    [true, true, undefined, 3, '3 places found.'],
  ] as const)(
    'valid=%s fresh=%s error=%s count=%d → %j',
    (valid, fresh, error, count, expected) => {
      expect(searchStatus(valid, fresh, error, count)).toBe(expected);
    },
  );
});
