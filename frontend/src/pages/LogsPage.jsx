import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { sh } from '../styles/shared';

const LIMIT = 50;

const KIND_COLORS = { MOTION: '#7c3aed', LIGHT: '#d97706' };

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [filters, setFilters] = useState({ sensor_id: '', from: '', to: '' });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/sensors').then(setSensors).catch(() => {});
  }, []);

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

  function handleApply() {
    fetchEvents(0, true);
  }

  function handleLoadMore() {
    fetchEvents(offset + LIMIT, false);
  }

  function handleClear() {
    setFilters({ sensor_id: '', from: '', to: '' });
    setTimeout(() => fetchEvents(0, true), 0);
  }

  return (
    <div style={s.root}>
      {/* Filter bar */}
      <div style={s.filterBar}>
        <select
          style={s.filterInput}
          value={filters.sensor_id}
          onChange={e => setFilters(f => ({ ...f, sensor_id: e.target.value }))}
        >
          <option value="">All Sensors</option>
          {sensors.map(sen => (
            <option key={sen.id} value={sen.id}>{sen.name} ({sen.sensor_key})</option>
          ))}
        </select>

        <label style={s.filterLabel}>From</label>
        <input
          type="datetime-local"
          style={s.filterInput}
          value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
        />

        <label style={s.filterLabel}>To</label>
        <input
          type="datetime-local"
          style={s.filterInput}
          value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
        />

        <button style={sh.btnSm} onClick={handleApply}>Apply</button>
        <button style={sh.btnSmGray} onClick={handleClear}>Clear</button>
      </div>

      {/* Events table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Timestamp</th>
              <th style={s.th}>Sensor</th>
              <th style={s.th}>Key</th>
              <th style={s.th}>Value</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} style={s.tr}>
                <td style={s.td}>{new Date(ev.ts).toLocaleString()}</td>
                <td style={s.td}>
                  <span style={s.kindDot(ev.sensor?.kind)} />
                  {ev.sensor?.name ?? '—'}
                </td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{ev.sensor?.sensor_key ?? '—'}</td>
                <td style={s.td}>
                  <span style={s.valueBadge(ev.value)}>{ev.value}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: 32 }}>No events found.</p>
        )}

        {loading && (
          <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: 16 }}>Loading…</p>
        )}

        {hasMore && !loading && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button style={sh.btn} onClick={handleLoadMore}>Load More</button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root:       { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' },
  filterBar:  { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, flexWrap: 'wrap' },
  filterLabel:{ fontSize: 12, fontWeight: 600, color: '#6b7280' },
  filterInput:{ padding: '5px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff' },
  tableWrap:  { flex: 1, overflowY: 'auto', padding: '0 16px 16px' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:         { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e5e7eb', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', position: 'sticky', top: 0, background: '#f9fafb' },
  tr:         { borderBottom: '1px solid #f3f4f6' },
  td:         { padding: '8px', color: '#374151' },
  kindDot:    (kind) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6, verticalAlign: 'middle',
    background: KIND_COLORS[kind] ?? '#6b7280',
  }),
  valueBadge: (value) => {
    const v = value?.toLowerCase();
    let bg = '#e5e7eb'; let color = '#374151';
    if (v === 'on' || v === 'active' || v === 'detected') { bg = '#dcfce7'; color = '#166534'; }
    else if (v === 'off' || v === 'idle') { bg = '#f1f5f9'; color = '#475569'; }
    else if (v === 'fault' || v === 'error') { bg = '#fef9c3'; color = '#854d0e'; }
    return { padding: '2px 8px', borderRadius: 3, fontSize: 12, fontWeight: 600, background: bg, color };
  },
};
