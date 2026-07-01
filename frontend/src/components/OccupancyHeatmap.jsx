import { colors } from '../styles/shared';

// Display order: Mon-first. Backend grid uses weekday index 0=Sun..6=Sat.
const WEEKDAYS = [
  { i: 1, label: 'Mon' }, { i: 2, label: 'Tue' }, { i: 3, label: 'Wed' },
  { i: 4, label: 'Thu' }, { i: 5, label: 'Fri' }, { i: 6, label: 'Sat' }, { i: 0, label: 'Sun' },
];
const pad = (n) => String(n).padStart(2, '0');

// Renders a campus occupancy heatmap from the /analytics/occupancy `heatmap` payload
// ({ grid: grid[hour][weekday] intensity 0..1, max }). Pure CSS grid, no chart lib.
export default function OccupancyHeatmap({ heatmap }) {
  if (!heatmap?.grid) return null;
  const { grid, max } = heatmap;
  const scale = max > 0 ? max : 1;
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="heatmap">
      <div className="heatmap-row heatmap-head">
        <div className="heatmap-hour" />
        {WEEKDAYS.map((w) => <div key={w.i} className="heatmap-col-label">{w.label}</div>)}
      </div>

      {hours.map((h) => (
        <div className="heatmap-row" key={h}>
          <div className="heatmap-hour">{h % 3 === 0 ? `${pad(h)}:00` : ''}</div>
          {WEEKDAYS.map((w) => {
            const v = grid[h]?.[w.i] ?? 0;
            const pct = Math.round(v * 100);
            return (
              <div
                key={w.i}
                className="heatmap-cell"
                title={`${w.label} ${pad(h)}:00 — ${pct}% occupied`}
                style={{ background: v > 0 ? `rgba(45, 143, 179, ${(v / scale) * 0.85 + 0.08})` : colors.compBg }}
              />
            );
          })}
        </div>
      ))}

      <div className="heatmap-legend">
        <span>Less</span>
        <span className="heatmap-legend-grad" />
        <span>More</span>
      </div>
    </div>
  );
}
