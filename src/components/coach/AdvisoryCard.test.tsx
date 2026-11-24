import { shareAdvisory } from './AdvisoryCard';

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
