import { lazy, Suspense, useCallback, useState, type ReactElement } from 'react';
import type { Place, Profile } from './core/types';
import { BudgetPanel } from './components/BudgetPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Hero } from './components/Hero';
import { HomeLabPanel } from './components/HomeLabPanel';
import { HouseholdPanel } from './components/HouseholdPanel';
import { SiteHeader } from './components/SiteHeader';
import { StatusBanner } from './components/StatusBanner';
import { SwapsPanel } from './components/SwapsPanel';
import { panelId, tabId, Tabs } from './components/Tabs';
import { TodayPanel } from './components/TodayPanel';
import { useAir } from './hooks/useAir';
import { useInsights } from './hooks/useInsights';
import { usePersistentState } from './hooks/usePersistentState';
import { usePlan } from './hooks/usePlan';
import { sanitiseProfile, STORAGE_KEYS } from './services/storage';

/** The AI panel is the heaviest and least-used screen, so it loads on demand. */
const CoachPanel = lazy(() => import('./components/CoachPanel'));

export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'budget', label: 'Breath budget' },
  { id: 'home', label: 'Home air lab' },
  { id: 'swaps', label: 'Swaps & impact' },
  { id: 'coach', label: 'Ask Saans' },
  { id: 'household', label: 'Household' },
] as const;
export type TabKey = (typeof TABS)[number]['id'];

export function App(): ReactElement {
  const [profile, setProfile] = usePersistentState<Profile>(STORAGE_KEYS.profile, sanitiseProfile);
  const [plan, planActions] = usePlan(profile);
  const [tab, setTab] = useState<TabKey>('today');
  const [day, setDay] = useState<0 | 1>(0);

  const air = useAir(profile.place);
  const insights = useInsights(air.snapshot, profile, plan, day);

  const update = useCallback(
    <K extends keyof Profile>(key: K, value: Profile[K]) =>
      setProfile((p) => ({ ...p, [key]: value })),
    [setProfile],
  );
  const selectPlace = useCallback((place: Place) => update('place', place), [update]);

  const panels: Record<TabKey, () => ReactElement> = {
    today: () => (
      <TodayPanel
        snapshot={air.snapshot}
        aqi={insights.aqi}
        outlook={insights.outlook}
        profile={profile}
        windowLabel={insights.windowLabel}
      />
    ),
    budget: () => (
      <BudgetPanel
        budget={insights.budget}
        swaps={insights.swaps}
        exposure={insights.exposure}
        day={day}
        onDayChange={setDay}
        onApply={planActions.apply}
        onRemove={planActions.remove}
        onAdd={planActions.add}
        onReset={planActions.rebuild}
      />
    ),
    home: () => (
      <HomeLabPanel
        room={profile.room}
        outdoorPm25={air.snapshot.current.pm2_5}
        onRoomChange={(room) => update('room', room)}
      />
    ),
    swaps: () => <SwapsPanel profile={profile} />,
    coach: () => (
      <Suspense fallback={<p className="card">Loading the AI coach…</p>}>
        <CoachPanel
          context={insights.coachContext}
          language={profile.language}
          onLanguageChange={(language) => update('language', language)}
        />
      </Suspense>
    ),
    household: () => (
      <HouseholdPanel
        profile={profile}
        onChange={setProfile}
        onRebuild={() => {
          planActions.rebuild();
          setTab('budget');
        }}
      />
    ),
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader place={profile.place} onSelectPlace={selectPlace} />
      <StatusBanner air={air} />
      <main id="main" tabIndex={-1}>
        <Hero
          aqi={insights.aqi}
          placeName={air.snapshot.place.name}
          status={air.status}
          budget={insights.budget}
          topSwap={insights.swaps[0]}
          ventilate={insights.windowLabel(insights.outlook.ventilate)}
          onOpenBudget={() => setTab('budget')}
        />
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Saans sections" />
        {TABS.map(({ id, label }) => (
          <section
            key={id}
            id={panelId(id)}
            role="tabpanel"
            aria-labelledby={tabId(id)}
            hidden={id !== tab}
            className="panel"
          >
            {id === tab ? <ErrorBoundary section={label}>{panels[id]()}</ErrorBoundary> : null}
          </section>
        ))}
      </main>
      <footer className="site-footer">
        <p>
          Air data: Open-Meteo (Copernicus CAMS forecasts). AQI: India CPCB breakpoints. All
          calculations run in your browser; estimates support everyday decisions and are not medical
          advice.
        </p>
      </footer>
    </>
  );
}
