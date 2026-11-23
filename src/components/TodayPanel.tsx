import { POLLUTANT_LABELS } from '../core/constants';
import { aqiAdvice, dominantText, formatConc } from '../core/explain';
import type { Outlook, TimeWindow } from '../core/forecast';
import { POLLUTANTS, type AirSnapshot, type AqiResult, type Profile } from '../core/types';
import { AqiGauge } from './AqiGauge';
import { HourlyChart } from './HourlyChart';

interface TodayPanelProps {
  snapshot: AirSnapshot;
  aqi: AqiResult;
  outlook: Outlook;
  profile: Profile;
  windowLabel: (window: TimeWindow | null) => string | null;
}

export function TodayPanel({ snapshot, aqi, outlook, profile, windowLabel }: TodayPanelProps) {
  const advice = aqiAdvice(aqi.category);
  const hasVulnerable =
    profile.children > 0 ||
    profile.elders > 0 ||
    profile.sensitiveMember ||
    profile.persona !== 'adult';
  const clean = windowLabel(outlook.cleanest);
  const windows = [
    {
      id: 'ventilate',
      title: 'Air out the house',
      window: outlook.ventilate,
      detail: 'Open windows wide for 10–15 minutes, then shut them again.',
    },
    {
      id: 'exercise',
      title: 'Best hour to exercise outside',
      window: outlook.exercise,
      detail: 'You breathe 3–4× more air when active, so timing matters most here.',
    },
    {
      id: 'sealed',
      title: 'Stay sealed in',
      window: outlook.dirtiest,
      detail: 'Worst stretch ahead: windows shut, purifier on, postpone errands.',
    },
  ];

  return (
    <div className="grid">
      <section className="card" aria-labelledby="now-heading">
        <h2 id="now-heading">Air right now</h2>
        <div className="now">
          <AqiGauge aqi={aqi} />
          <div>
            <p className="lead">{dominantText(aqi.dominant)}</p>
            <p>
              PM2.5 is <strong>{formatConc(snapshot.current.pm2_5)}</strong> —{' '}
              {Math.round(snapshot.current.pm2_5 / 15)}× the WHO daily guideline.
            </p>
            <p>{advice.general}</p>
            <p className={hasVulnerable ? 'callout' : undefined}>
              <strong>{hasVulnerable ? 'For your family: ' : 'Sensitive groups: '}</strong>
              {advice.sensitive}
            </p>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="windows-heading">
        <h2 id="windows-heading">Your windows for the next 24 hours</h2>
        <ul className="windows">
          {windows.map((item) => (
            <li key={item.id} className={`window window-${item.id}`}>
              <span className="window-title">{item.title}</span>
              <span className="window-time">{windowLabel(item.window) ?? 'Not available'}</span>
              {item.window ? (
                <span className="muted"> · avg {formatConc(item.window.average)}</span>
              ) : null}
              <p className="hint">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card span-2" aria-labelledby="forecast-heading">
        <h2 id="forecast-heading">PM2.5 forecast</h2>
        <HourlyChart
          hours={outlook.hours}
          highlight={outlook.cleanest}
          summary={
            clean
              ? `Hourly PM2.5 for the next 24 hours. The highlighted cleanest stretch is ${clean}, averaging ${formatConc(outlook.cleanest?.average ?? 0)}.`
              : 'Hourly PM2.5 for the next 24 hours.'
          }
        />
      </section>

      <section className="card span-2" aria-labelledby="pollutants-heading">
        <h2 id="pollutants-heading">All pollutants</h2>
        <table className="pollutants">
          <caption className="visually-hidden">Current concentrations and CPCB sub-indices</caption>
          <thead>
            <tr>
              <th scope="col">Pollutant</th>
              <th scope="col">Now</th>
              <th scope="col">Sub-index</th>
            </tr>
          </thead>
          <tbody>
            {POLLUTANTS.map((p) => (
              <tr key={p} className={p === aqi.dominant ? 'dominant' : undefined}>
                <th scope="row">{POLLUTANT_LABELS[p]}</th>
                <td>{formatConc(snapshot.current[p])}</td>
                <td>{aqi.subIndices[p] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Index uses India&apos;s CPCB National AQI breakpoints applied to the latest hourly values,
          so it reacts faster than the official 24-hour average.
        </p>
      </section>
    </div>
  );
}
