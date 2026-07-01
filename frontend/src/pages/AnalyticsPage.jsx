import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import PageTitle from '../components/PageTitle';
import OccupancyHeatmap from '../components/OccupancyHeatmap';
import { api } from '../api/client';
import { colors } from '../styles/shared';

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
];
const TABS = [
  { key: 'energy', label: 'Energy' },
  { key: 'occupancy', label: 'Occupancy' },
];
const WD_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toHours = (min) => (min / 60).toFixed(1);

export default function AnalyticsPage() {
  const [tab, setTab] = useState('energy');
  const [days, setDays] = useState(7);
  const [energy, setEnergy] = useState(null);
  const [occ, setOcc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    const qs = `from=${from.toISOString()}&to=${to.toISOString()}`;
    const path = tab === 'energy' ? `/analytics/wasted-lighting?${qs}` : `/analytics/occupancy?${qs}`;
    api.get(path)
      .then((d) => { if (!cancelled) (tab === 'energy' ? setEnergy : setOcc)(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, days]);

  const data = tab === 'energy' ? energy : occ;

  return (
    <div>
      <PageTitle>Analytics</PageTitle>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `1px solid ${colors.border}` }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none', marginBottom: -1,
              color: tab === t.key ? colors.action : colors.textSecondary,
              borderBottom: tab === t.key ? `2px solid ${colors.action}` : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            style={{
              padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${colors.border}`,
              background: days === r.days ? colors.action : colors.white,
              color: days === r.days ? '#fff' : colors.textSecondary,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: colors.textSecondary }}>Loading analytics…</div>}
      {error && <div style={{ color: colors.remove }}>{error}</div>}

      {!loading && !error && data && tab === 'energy' && <EnergyTab data={energy} />}
      {!loading && !error && data && tab === 'occupancy' && <OccupancyTab data={occ} />}
    </div>
  );
}

// ── Energy (wasted lighting + cost) ──────────────────────────────────────────
function EnergyTab({ data }) {
  const rooms = data.rooms ?? [];
  const top = rooms[0];
  const chartData = rooms.slice(0, 10).map((r) => ({
    name: r.label || r.code || r.name,
    hours: +(r.wasted_minutes / 60).toFixed(2),
    cost: r.wasted_cost ?? 0,
  }));

  return (
    <>
      <div className="analytics-stat-grid">
        <Stat label="Wasted lighting" value={`${(data.total_wasted_minutes / 60).toFixed(1)}h`} sub="lights on, no motion" />
        <Stat label="Wasted cost" value={`₪${(data.total_wasted_cost ?? 0).toFixed(2)}`} sub={`${(data.total_wasted_kwh ?? 0).toFixed(1)} kWh`} subColor={colors.remove} />
        <Stat label="CO₂" value={`${(data.total_wasted_co2 ?? 0).toFixed(1)} kg`} sub="from wasted lighting" />
        <Stat label="Worst room" value={top ? (top.label || top.code) : '—'} sub={top ? `₪${(top.wasted_cost ?? 0).toFixed(2)} · ${toHours(top.wasted_minutes)}h` : 'no data'} subColor={colors.remove} />
      </div>

      <ChartCard title="Wasted lighting by room (hours)" style={{ marginTop: 16 }}>
        {chartData.length === 0 ? (
          <Empty text="No wasted lighting in this window." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 28, top: 4, bottom: 4 }}>
              <XAxis type="number" tickFormatter={(v) => `${v}h`} stroke={colors.textMuted} fontSize={12} />
              <YAxis type="category" dataKey="name" width={88} stroke={colors.textMuted} fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(45,143,179,0.06)' }} formatter={(v, _n, p) => [`${v} h  (₪${(p.payload.cost ?? 0).toFixed(2)})`, 'Wasted']} />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => <Cell key={entry.name} fill={i === 0 ? colors.remove : colors.action} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}

// ── Occupancy (heatmap + utilization) ────────────────────────────────────────
function OccupancyTab({ data }) {
  const rooms = data.rooms ?? [];
  const top = rooms[0];
  const peak = data.peak;
  const peakLabel = peak && peak.hour != null
    ? `${WD_LABELS[peak.weekday]} ${String(peak.hour).padStart(2, '0')}:00`
    : '—';
  const op = data.operating;
  const chartData = rooms.slice(0, 10).map((r) => ({ name: r.label || r.code || r.name, util: r.utilization_pct }));

  return (
    <>
      <div className="analytics-stat-grid">
        <Stat label="Avg utilization" value={`${data.avg_utilization_pct ?? 0}%`} sub={op ? `of ${op.days} ${op.start}:00–${op.end}:00` : ''} />
        <Stat label="Busiest room" value={top ? (top.label || top.code) : '—'} sub={top ? `${top.utilization_pct}% utilized` : 'no data'} subColor={colors.action} />
        <Stat label="Peak time" value={peakLabel} sub={peak ? `${Math.round((peak.intensity ?? 0) * 100)}% occupied` : ''} />
      </div>

      <ChartCard title="When is the campus busy? (occupancy by hour × weekday)" style={{ marginTop: 16 }}>
        <OccupancyHeatmap heatmap={data.heatmap} />
      </ChartCard>

      <ChartCard title="Utilization by room (% of operating hours)" style={{ marginTop: 16 }}>
        {chartData.length === 0 ? (
          <Empty text="No occupancy in this window." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 28, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke={colors.textMuted} fontSize={12} />
              <YAxis type="category" dataKey="name" width={88} stroke={colors.textMuted} fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(45,143,179,0.06)' }} formatter={(v) => [`${v}%`, 'Utilization']} />
              <Bar dataKey="util" radius={[0, 4, 4, 0]} fill={colors.action} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────────
function Stat({ label, value, sub, subColor }) {
  return (
    <div className="card analytics-stat-card">
      <div className="analytics-stat-label">{label}</div>
      <div className="analytics-stat-value">{value}</div>
      <div className="analytics-stat-change" style={{ color: subColor || colors.textMuted }}>{sub}</div>
    </div>
  );
}
function ChartCard({ title, children, style }) {
  return (
    <div className="card analytics-chart-card" style={style}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: colors.textPrime }}>{title}</div>
      {children}
    </div>
  );
}
function Empty({ text }) {
  return <div style={{ color: colors.textSecondary }}>{text}</div>;
}
