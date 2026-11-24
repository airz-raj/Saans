import { metroCommute } from '../../testing/fixtures';
import { describeActivity } from './DayTimeline';

describe('describeActivity', () => {
  it('names the transport mode for trips and the place otherwise', () => {
    expect(describeActivity(metroCommute)).toBe('Metro');
    expect(describeActivity({ ...metroCommute, setting: 'outdoor-green', mode: undefined })).toBe(
      'Park / green area',
    );
  });
});
