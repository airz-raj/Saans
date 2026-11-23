import { lazy, Suspense, useCallback, useState } from 'react';
import { applySwap } from './core/optimizer';
import { buildDefaultPlan } from './core/plan';
import type { Activity, Place, Profile, Swap } from './core/types';
import { BudgetPanel } from './components/BudgetPanel';
import { Hero } from './components/Hero';
import { HomeLabPanel } from './components/HomeLabPanel';
import { HouseholdPanel } from './components/HouseholdPanel';
import { LocationPicker } from './components/LocationPicker';
import { StatusBanner } from './components/StatusBanner';
import { SwapsPanel } from './components/SwapsPanel';
import { panelId, tabId, Tabs } from './components/Tabs';
import { TodayPanel } from './components/TodayPanel';
import { useAir } from './hooks/useAir';
import { useInsights } from './hooks/useInsights';
import { usePersistentState } from './hooks/usePersistentState';
import { readStored, sanitisePlan, sanitiseProfile, STORAGE_KEYS } from './services/storage';

/** The AI panel is the heaviest and least-used screen, so it loads on demand. */
const CoachPanel = lazy(() => import('./components/CoachPanel'));

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'budget', label: 'Breath budget' },
  { id: 'home', label: 'Home air lab' },
  { id: 'swaps', label: 'Swaps & impact' },
  { id: 'coach', label: 'Ask Saans' },
  { id: 'household', label: 'Household' },
] as const;
type TabKey = (typeof TABS)[number]['id'];

const loadPlan = (stored: unknown): Activity[] =>
  sanitisePlan(stored) ?? buildDefaultPlan(sanitiseProfile(readStored(STORAGE_KEYS.profile)));

export function App() {
  const [profile, setProfile] = usePersistentState<Profile>(STORAGE_KEYS.profile, sanitiseProfile);
  const [plan, setPlan] = usePersistentState<Activity[]>(STORAGE_KEYS.plan, loadPlan);
  const [tab, setTab] = useState<TabKey>('today');
  const [day, setDay] = useState<0 | 1>(0);

  const air = useAir(profile.place);
  const insights = useInsights(air.snapshot, profile, plan, day);

  const selectPlace = useCallback(
    (place: Place) => setProfile((p) => ({ ...p, place })),
    [setProfile],
  );
  const applyPlanSwap = useCallback(
    (swap: Swap) => setPlan((current) => applySwap(current, swap)),
    [setPlan],
  );
  const removeActivity = useCallback(
    (id: string) => setPlan((current) => current.filter((a) => a.id !== id)),
    [setPlan],
  );
  const addActivity = useCallback(
    (activity: Activity) =>
      setPlan((current) => [...current, activity].sort((a, b) => a.start - b.start)),
    [setPlan],
  );
  const rebuildPlan = useCallback(() => setPlan(buildDefaultPlan(profile)), [setPlan, profile]);

  const renderPanel = (key: TabKey) => {
    switch (key) {
      case 'today':
        return (
          <TodayPanel
            snapshot={air.snapshot}
            aqi={insights.aqi}
            outlook={insights.outlook}
            profile={profile}
            windowLabel={insights.windowLabel}
          />
        );
      case 'budget':
        return (
          <BudgetPanel
            budget={insights.budget}
            swaps={insights.swaps}
            exposure={insights.exposure}
            day={day}
            onDayChange={setDay}
            onApply={applyPlanSwap}
            onRemove={removeActivity}
            onAdd={addActivity}
            onReset={rebuildPlan}
          />
        );
      case 'home':
        return (
          <HomeLabPanel
            room={profile.room}
            outdoorPm25={air.snapshot.current.pm2_5}
            onRoomChange={(room) => setProfile((p) => ({ ...p, room }))}
          />
        );
      case 'swaps':
        return <SwapsPanel profile={profile} />;
      case 'coach':
        return (
          <Suspense fallback={<p className="card">Loading the AI coach…</p>}>
            <CoachPanel
              context={insights.coachContext}
              language={profile.language}
              onLanguageChange={(language) => setProfile((p) => ({ ...p, language }))}
            />
          </Suspense>
        );
      case 'household':
        return (
          <HouseholdPanel
            profile={profile}
            onChange={setProfile}
            onRebuild={() => {
              rebuildPlan();
              setTab('budget');
            }}
          />
        );
    }
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand">
          <svg viewBox="0 0 64 64" aria-hidden="true" className="brand-mark">
            <path d="M10 38c7-11 16-11 21-4s15 7 23-4" />
            <path d="M10 26c7-11 16-11 21-4s15 7 23-4" />
          </svg>
          <div>
            <h1>Saans</h1>
            <p className="tagline">
              See the air your family breathes. Change the day, not just the mask.
            </p>
          </div>
        </div>
        <LocationPicker current={profile.place} onSelect={selectPlace} />
      </header>
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
        {TABS.map(({ id }) => (
          <section
            key={id}
            id={panelId(id)}
            role="tabpanel"
            aria-labelledby={tabId(id)}
            hidden={id !== tab}
            className="panel"
          >
            {id === tab ? renderPanel(id) : null}
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
