# Saans · साँस — Urban Air Quality Assistant

> GenAI assistant that helps families and communities get through winter smog: it shows how much
> polluted air each person actually breathes, re-plans the day around the cleaner hours, fixes indoor
> air with real physics, and shows how much pollution the household can stop adding to the city.

Built for **PromptWars Virtual · Challenge 6 — Urban Air Quality Assistant**.

- **Solution design:** [docs/SOLUTION.md](docs/SOLUTION.md)
- **Architecture & framework:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Problem statement → features

| The challenge asks for…                  | Saans delivers                                                                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A **GenAI-powered assistant**            | **Ask Saans**: Google **Gemini** writes the family's plan for the day, answers questions and drafts community advisories, using only the numbers Saans computed (structured JSON output, re-validated on the server) |
| Help for **families and communities**    | Household profile (children, elders, asthma/heart/pregnancy). **Community multiplier** and a shareable **RWA/school advisory** in English or Hindi                                                                   |
| Navigating **severe winter smog**        | Live hourly forecast on India's **CPCB AQI** scale; a **clean-window finder** for the best time to air out the house or exercise, and the hours to stay sealed                                                       |
| **Low-emission daily routines**          | **Breath Budget**: per-activity inhaled dose and a one-tap optimizer that moves, re-routes or moves indoors the riskiest parts of the day. It never suggests a mode that emits more CO₂                              |
| **Indoor air quality hacks**             | **Home Air Lab**: a mass-balance model of your room ranks hacks (box-fan filter, sealing gaps, chimney, swapping coils and incense) by the µg/m³ each one removes, plus myth-busters                                 |
| **Sustainable alternatives**             | **Exhale ledger**: commute, cooking-fuel, waste-burning, generator and firecracker swaps with weekly and seasonal PM₂.₅ and CO₂ avoided                                                                              |
| **Tailored to location and lifestyle**   | City search or geolocation for live data; commute, exercise, room and family settings drive every number                                                                                                             |
| **Clearly explaining the direct impact** | Every suggestion shows _before → after_ (µg inhaled, indoor µg/m³, kg CO₂, minutes) and a one-line reason                                                                                                            |

## How it works

```
dose (µg) = PM2.5 where you are × breathing rate for the effort × time
indoor    = (P·a·C_out + sources/V) / (a + deposition + CADR/V)
```

Inhaled dose, not the AQI number, is what reaches the lungs. A 45-minute roadside jog at 7 AM in
Delhi smog can be a fifth of a whole day's dose. Saans makes that visible and fixes it. All
assumptions are documented in [`src/core/constants.ts`](src/core/constants.ts).

## Tech

| Layer         | Choice                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| UI            | React 19 + TypeScript (strict) + Vite, hand-written SVG charts, no UI or chart libraries                         |
| Domain engine | Pure TypeScript in `src/core` (AQI, exposure, indoor model, emissions, optimizer, explanations)                  |
| Serverless    | Vercel Functions in `api/` using Web-standard `Request`/`Response`                                               |
| GenAI         | Google Gemini `generateContent` with JSON response schema (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`)      |
| Data          | Open-Meteo Air Quality (Copernicus CAMS) and Geocoding: keyless, called only from the server                     |
| Quality       | Vitest + Testing Library + axe-core, ESLint (typescript-eslint, jsx-a11y, react-hooks), Prettier, GitHub Actions |

## Run locally

```bash
npm ci
cp .env.example .env      # optional: add GEMINI_API_KEY for the AI coach
npm run dev               # http://localhost:5173 — /api routes are served by a Vite plugin
```

Without a key, everything works and the coach falls back to its built-in explanation engine.

```bash
npm run check             # lint + typecheck + tests + production build
npm run coverage          # test coverage report
```

## Deploy (Vercel)

```bash
vercel link
vercel env add GEMINI_API_KEY production
vercel --prod
```

No database, no extra servers, no build-time secrets. Static assets ship with immutable caching.
`/api/air` is edge-cached for 15 minutes and `/api/geocode` for a day.

## Security

- Gemini key is server-side only (no `VITE_` prefix) and sent in a header, never in a URL.
- Every input is validated with zod: coordinate ranges, a letters-only place search, bounded numeric
  coach context, 500-character questions and a 16 KB body cap.
- Prompt-injection defences: the question is fenced and sanitised, the system instruction forbids
  following embedded instructions, output is schema-constrained and re-validated.
- Same-origin and `Sec-Fetch-Site` checks, a per-client token-bucket rate limit and upstream timeouts.
- Strict CSP (`default-src 'self'`, no inline scripts), HSTS, `frame-ancestors 'none'`, `nosniff`,
  `Referrer-Policy` and a minimal `Permissions-Policy`.
- Privacy: profile and plan live in `localStorage` only, re-validated on load. Coordinates are
  rounded to about 1 km. The AI receives only anonymous counts and computed numbers.

## Accessibility

WCAG 2.1 AA target: semantic landmarks and a skip link, ARIA tabs with arrow/Home/End keys, labelled
form controls, `aria-live` updates for recalculated results, a data table for every chart, AQI
category always written out (colour is never the only cue), 44 px touch targets, visible focus,
`prefers-color-scheme`, `prefers-reduced-motion` and `forced-colors` support, and a Hindi reply
option. axe-core runs against every tab in the test suite.

## Efficiency

Pure functions memoised with `useMemo`. Only the active tab renders, and the AI panel is
lazy-loaded. The client cache has a TTL and de-duplicates in-flight requests, and stale requests are
aborted. The search box is debounced. Results are cached at the CDN, and identical AI requests are
answered from the client cache. Production JS is about 90 KB gzipped, React included.

## Project layout

```
api/                 Vercel functions (air, geocode, coach) + _lib (validation, rate limit, Gemini, Open-Meteo)
src/core/            Domain engine — pure, fully unit-tested
src/services/        API client (cache, de-dup, abort) and validated local storage
src/hooks/           useAir, useInsights, usePersistentState, useDebouncedValue
src/components/      Accessible UI panels
tests/api/           Handler tests with mocked upstreams
docs/                Solution design and architecture
```

## Disclaimer

Saans gives planning estimates to support everyday decisions. It is not medical advice. Anyone with
breathlessness or chest pain should seek medical care.

## License

MIT
