import type { ReactElement } from 'react';
import { categoryFor, categoryToken, subIndex } from '../core/aqi';
import { formatConc } from '../core/explain';
import { formatHour, pointHour, type TimeWindow } from '../core/forecast';
import type { HourPoint } from '../core/types';

interface HourlyChartProps {
  hours: readonly HourPoint[];
  highlight: TimeWindow | null;
  summary: string;
}

const WIDTH = 480;
const BASE = 128;

/** Hand-drawn SVG bars (no chart library) with a data table for screen readers and keyboard users. */
export function HourlyChart({
  hours,
  highlight,
  summary,
}: Readonly<HourlyChartProps>): ReactElement {
  const max = Math.max(60, ...hours.map((h) => h.pm2_5));
  const barWidth = WIDTH / Math.max(1, hours.length);
  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${BASE}`}
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
      >
        {highlight ? (
          <rect
            className="chart-highlight"
            x={highlight.index * barWidth}
            y={0}
            width={highlight.length * barWidth}
            height={BASE}
          />
        ) : null}
        {hours.map((hour, i) => {
          const height = Math.max(2, (hour.pm2_5 / max) * (BASE - 12));
          const token = categoryToken(categoryFor(subIndex('pm2_5', hour.pm2_5) ?? 0));
          return (
            <rect
              key={hour.time}
              className={`bar aqi-${token}`}
              x={i * barWidth + 1.5}
              y={BASE - height}
              width={barWidth - 3}
              height={height}
              rx={2}
            />
          );
        })}
      </svg>
      <div
        className="chart-axis"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}
      >
        {hours.map((hour, i) => (
          <span key={hour.time}>{i % 3 === 0 ? formatHour(pointHour(hour)) : ''}</span>
        ))}
      </div>
      <figcaption className="hint">{summary}</figcaption>
      <details className="chart-table">
        <summary>Show hourly values as a table</summary>
        <table>
          <caption className="visually-hidden">Forecast PM2.5 by hour</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">PM2.5</th>
              <th scope="col">Level</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour.time}>
                <th scope="row">{formatHour(pointHour(hour))}</th>
                <td>{formatConc(hour.pm2_5)}</td>
                <td>{categoryFor(subIndex('pm2_5', hour.pm2_5) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
