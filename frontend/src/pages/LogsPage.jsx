import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { colors, container } from '../styles/shared';

const LIMIT = 50;

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [filters, setFilters] = useState({ sensor_id: '', from: '', to: '' });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/sensors').then(setSensors).catch(() => {}); }, []);
  useEffect(() => { fetchEvents(0, true); }, []);

  async function fetchEvents(newOffset, replace) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.sensor_id) params.set('sensor_id', filters.sensor_id);
      if (filters.from) params.set('from', new Date(filters.from).toISOString());
      if (filters.to) params.set('to', new Date(filters.to).toISOString());
      params.set('limit', LIMIT);
      params.set('offset', newOffset);
      const data = await api.get(`/events?${params}`);
      setEvents(prev => replace ? data : [...prev, ...data]);
      setOffset(newOffset);
      setHasMore(data.length === LIMIT);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function handleApply() { fetchEvents(0, true); }
  function handleLoadMore() { fetchEvents(offset + LIMIT, false); }
  function handleClear() {
    setFilters({ sensor_id: '', from: '', to: '' });
    setTimeout(() => fetchEvents(0, true), 0);
  }

  function valueBadge(value) {
    const v = value?.toLowerCase();
    if (v === 'on' || v === 'active' || v === 'detected') return { text: 'ON', bg: colors.sensorOn, color: '#fff' };
    if (v === 'off' || v === 'idle') return { text: 'OFF', bg: colors.actionOff, color: '#fff' };
    if (v === 'fault' || v === 'error') return { text: value, bg: '#eab308', color: '#fff' };
    return { text: value ?? '—', bg: colors.compBg, color: colors.textPrime };
  }

  return (
    <div style={s.root}>
      <div style={s.cont}>
      <h2 style={s.pageTitle}>Logs</h2>

      {/* Filter bar */}
      <div style={s.filterBar}>
        <div style={s.filterWrap}>
          <span style={s.filterIcon}>▼</span>
          <select style={s.filterSelect} value={filters.sensor_id} onChange={e => setFilters(f => ({ ...f, sensor_id: e.target.value }))}>
            <option value="">Filter</option>
            {sensors.map(sen => <option key={sen.id} value={sen.id}>{sen.name} ({sen.sensor_key})</option>)}
          </select>
        </div>

        <input type="date" style={s.dateInput} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <input type="date" style={s.dateInput} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />

        <button style={s.applyBtn} onClick={handleApply}>Apply</button>
        <button style={s.clearBtn} onClick={handleClear}>Clear</button>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.headRow}>
              <th style={s.th}>DATE / TIME</th>
              <th style={s.th}>KEY</th>
              <th style={s.th}>SENSOR</th>
              <th style={s.th}>VALUE</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => {
              const badge = valueBadge(ev.value);
              return (
                <tr key={ev.id} style={s.row}>
                  <td style={s.td}>{new Date(ev.ts).toLocaleDateString()}, {new Date(ev.ts).toLocaleTimeString()}</td>
                  <td style={s.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ev.sensor?.sensor_key ?? '—'}</span></td>
                  <td style={s.td}>{ev.sensor?.kind?.toLowerCase() ?? '—'}</td>
                  <td style={s.td}>
                    <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.text}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {events.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 32 }}>No events found.</p>
        )}
        {loading && <p style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 16 }}>Loading…</p>}
        {hasMore && !loading && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button style={s.applyBtn} onClick={handleLoadMore}>Load More</button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

const s = {
  root:       { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: 'system-ui, sans-serif', background: colors.pageBg, overflowY: 'auto' },
  cont:       { ...container.base, display: 'flex', flexDirection: 'column', paddingBottom: 20 },
  pageTitle:  { margin: '16px 0 12px', fontSize: 18, fontWeight: 700, color: colors.textPrime },

  filterBar:  { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  filterWrap: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.white },
  filterIcon: { fontSize: 10, color: colors.textSecondary },
  filterSelect:{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: colors.textPrime, cursor: 'pointer' },
  dateInput:  { padding: '5px 10px', fontSize: 13, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.white, color: colors.textPrime },
  applyBtn:   { padding: '6px 16px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  clearBtn:   { padding: '6px 16px', background: colors.white, color: colors.textPrime, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 },

  tableWrap:  { overflowY: 'auto', background: colors.white, borderRadius: 10, border: `1px solid ${colors.border}` },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  headRow:    { background: colors.compBg },
  th:         { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${colors.border}` },
  row:        { borderBottom: `1px solid ${colors.border}` },
  td:         { padding: '10px 12px', color: colors.textPrime, fontSize: 13 },
};
