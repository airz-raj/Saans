import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleSnapshot } from './core/sampleAir';
import { App } from './App';
import { clearApiCache } from './services/api';
import { axeViolations } from './testing/axe';
import { installFetch } from './testing/fakeFetch';

const TAB_NAMES = [
  'Today',
  'Breath budget',
  'Home air lab',
  'Swaps & impact',
  'Ask Saans',
  'Household',
];

beforeEach(() => {
  clearApiCache();
  installFetch(() => ({
    status: 503,
    body: { error: 'AI coach is not configured', fallback: true },
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('App shell', () => {
  it('opens on Today with a sample day and a written-out AQI category', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Saans' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/sample winter-smog day/i)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Air Quality Index \d+, (Poor|Very Poor|Severe)/ }),
    ).toBeInTheDocument();
  });

  it('supports arrow, Home and End keys on the tab list', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Today' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Breath budget' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Breath budget' })).toBeVisible();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Household' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}{Home}');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveFocus();
  });

  it.each(TAB_NAMES)('has no detectable accessibility violations on "%s"', async (name) => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('tab', { name }));
    await screen.findByRole('tabpanel', { name });
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Breath budget', () => {
  it('applies a swap and lowers the daily dose', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Breath budget' }));
    const total = () => screen.getByText('PM2.5 inhaled over 24 h').previousSibling?.textContent;
    const before = total();
    const swaps = screen.getByRole('heading', { name: 'Swaps that cut your dose' }).parentElement!;
    await user.click(within(swaps).getAllByRole('button', { name: 'Apply to my day' })[0]!);
    expect(total()).not.toBe(before);
    expect(screen.getByText(/^Applied:/)).toBeInTheDocument();
  });

  it('adds and removes activities and can reset the day', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Breath budget' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('button', { name: 'Remove Walk in the park' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Walk in the park' }));
    await user.click(screen.getByRole('button', { name: 'Remove Sleep' }));
    expect(screen.queryByRole('button', { name: 'Remove Sleep' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset to usual day' }));
    expect(screen.getByRole('button', { name: 'Remove Sleep' })).toBeInTheDocument();
  });

  it('switches to tomorrow', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Breath budget' }));
    await user.click(screen.getByRole('radio', { name: 'Tomorrow' }));
    expect(screen.getByRole('radio', { name: 'Tomorrow' })).toBeChecked();
  });
});

describe('Home air lab', () => {
  it('adopting a hack lowers indoor PM2.5 and persists the room', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Home air lab' }));
    const indoor = () => screen.getByText(/^indoors ·/).previousSibling?.textContent;
    const before = indoor();
    await user.click(screen.getAllByRole('button', { name: 'I did this' })[0]!);
    expect(indoor()).not.toBe(before);
    expect(localStorage.getItem('saans.profile.v1')).toContain('"purifierCadr":250');
  });

  it('reacts to moment and room changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Home air lab' }));
    await user.selectOptions(screen.getByLabelText('Moment'), 'cooking');
    await user.selectOptions(screen.getByLabelText('Cooking fuel'), 'biomass');
    expect(screen.getByText('Move from wood/dung to LPG')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Kitchen chimney / exhaust fan'));
    expect(screen.queryByText('Run the chimney / exhaust while cooking')).not.toBeInTheDocument();
  });
});

describe('Swaps & impact', () => {
  it('scales the ledger to the community', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Swaps & impact' }));
    expect(screen.getByText(/Daily two-wheeler commute/)).toBeInTheDocument();
    const homes = screen.getByLabelText('Homes in your society, street or school');
    await user.clear(homes);
    await user.type(homes, '1000');
    expect(homes).toHaveValue(1000);
    await user.tab();
    expect(homes).toHaveValue(1000);
    await user.clear(screen.getAllByLabelText('Times a week')[0]!);
    await user.type(screen.getAllByLabelText('Times a week')[0]!, '7');
    expect(screen.getAllByLabelText('Times a week')[0]).toHaveValue(7);
  });
});

describe('Ask Saans', () => {
  it('falls back to the offline explanation when Gemini is unavailable', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Ask Saans' }));
    await user.click(await screen.findByRole('button', { name: 'Write my plan' }));
    expect(await screen.findByText(/Offline explanation/)).toBeInTheDocument();
    expect(screen.getByText(/today's plan keeps your dose/)).toBeInTheDocument();
  });

  it('shows Gemini answers and sends the chosen language', async () => {
    const fetchMock = installFetch((url, init) => {
      if (url.pathname !== '/api/coach') return undefined;
      const body = JSON.parse(String(init?.body)) as { mode: string; language: string };
      if (body.mode === 'ask')
        return { body: { result: { answer: `Answer in ${body.language}`, followUps: ['Next?'] } } };
      return { body: { result: { title: 'सलाह', message: 'खिड़कियाँ बंद रखें' } } };
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Ask Saans' }));
    await user.selectOptions(await screen.findByLabelText('Reply language'), 'hi');
    await user.click(screen.getByRole('button', { name: /safe to take my child/ }));
    await user.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('Answer in hi')).toBeInTheDocument();
    expect(screen.getAllByText(/Written by Gemini/)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Next?' }));
    expect(screen.getByLabelText('Your question')).toHaveValue('Next?');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    await user.click(screen.getByRole('button', { name: 'Draft advisory' }));
    expect(await screen.findByText('खिड़कियाँ बंद रखें')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share or copy' }));
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/coach',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('Household and location', () => {
  it('rebuilds the day from new settings', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Household' }));
    await user.selectOptions(screen.getByLabelText('Commute by'), 'none');
    await user.click(screen.getByLabelText(/Exercises or walks/));
    await user.click(screen.getByRole('button', { name: 'Rebuild my day from these settings' }));
    expect(screen.getByRole('tab', { name: 'Breath budget' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('button', { name: /Remove Commute/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove Walk/ })).not.toBeInTheDocument();
  });

  it('searches a city and loads live air for it', async () => {
    const live = sampleSnapshot();
    installFetch((url) => {
      if (url.pathname === '/api/geocode') {
        return {
          body: {
            results: [
              { name: 'Gurugram', admin: 'Haryana', country: 'India', lat: 28.46, lon: 77.03 },
            ],
          },
        };
      }
      if (url.pathname === '/api/air') {
        return {
          body: {
            timezone: 'Asia/Kolkata',
            current: live.current,
            hourly: live.hourly,
            fetchedAt: live.fetchedAt,
          },
        };
      }
      return undefined;
    });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Search city or locality'), 'Gurugram');
    const result = await screen.findByRole(
      'button',
      { name: /Gurugram, Haryana/ },
      { timeout: 2000 },
    );
    await user.click(result);
    expect(await screen.findByText(/Live data for Gurugram/)).toBeInTheDocument();
    expect(screen.getByText('Gurugram')).toBeInTheDocument();
  });

  it('shows a clear message when live data fails', async () => {
    installFetch((url) =>
      url.pathname === '/api/geocode'
        ? { body: { results: [{ name: 'Pune', lat: 18.52, lon: 73.86 }] } }
        : { status: 502, body: { error: 'Live air data is unavailable right now' } },
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Search city or locality'), 'Pune');
    await user.click(await screen.findByRole('button', { name: /Pune/ }, { timeout: 2000 }));
    expect(await screen.findByText(/Couldn't load live data/)).toBeInTheDocument();
  });

  it('uses browser geolocation when allowed', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: 28.3531, longitude: 76.9404 } } as GeolocationPosition),
    );
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await act(async () => {});
    expect(screen.getByText('My location')).toBeInTheDocument();
    expect(localStorage.getItem('saans.profile.v1')).toContain('"lat":28.35');
  });
});
