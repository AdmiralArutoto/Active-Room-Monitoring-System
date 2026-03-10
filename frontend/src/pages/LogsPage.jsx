import { useEffect, useState } from 'react';
import { api } from '../api/client';
import PageTitle from '../components/PageTitle';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import TableShell from '../components/TableShell';
import StatusPill from '../components/StatusPill';

const LIMIT = 50;

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [filters, setFilters] = useState({ sensor_id: '', from: '', to: '' });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/sensors').then(setSensors).catch(() => setSensors([]));
  }, []);

  useEffect(() => {
    fetchEvents(0, true, filters);
  }, []);

  async function fetchEvents(nextOffset, replace, activeFilters = filters) {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (activeFilters.sensor_id) params.set('sensor_id', activeFilters.sensor_id);
      if (activeFilters.from) params.set('from', new Date(activeFilters.from).toISOString());
      if (activeFilters.to) params.set('to', new Date(activeFilters.to).toISOString());
      params.set('limit', LIMIT);
      params.set('offset', nextOffset);

      const data = await api.get(`/events?${params.toString()}`);
      setEvents((prev) => (replace ? data : [...prev, ...data]));
      setOffset(nextOffset);
      setHasMore(data.length === LIMIT);
    } catch {
      if (replace) setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    fetchEvents(0, true, filters);
  }

  function handleLoadMore() {
    fetchEvents(offset + LIMIT, false, filters);
  }

  function handleClear() {
    const reset = { sensor_id: '', from: '', to: '' };
    setFilters(reset);
    fetchEvents(0, true, reset);
  }

  return (
    <div>
      <PageTitle>Logs</PageTitle>

      <div className="toolbar" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="search-filter" aria-label="Filter by sensor">
            <span style={{ color: 'var(--text-secondary)', fontSize: 16 }}>⌵</span>
            <select
              value={filters.sensor_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, sensor_id: e.target.value }))}
              style={{ border: 0, outline: 'none', background: 'transparent', minWidth: 160 }}
            >
              <option value="">Filter</option>
              {sensors.map((sensor) => (
                <option key={sensor.id} value={sensor.id}>
                  {sensor.name} ({sensor.sensor_key})
                </option>
              ))}
            </select>
          </label>

          <input
            type="date"
            className="date-input"
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
          />

          <input
            type="date"
            className="date-input"
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PrimaryButton onClick={handleApply}>Apply</PrimaryButton>
          <SecondaryButton onClick={handleClear}>Clear</SecondaryButton>
        </div>
      </div>

      <TableShell>
        <table>
          <thead>
            <tr>
              <th>DATE / TIME</th>
              <th>KEY</th>
              <th>SENSOR</th>
              <th>VALUE</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>
                  {new Date(ev.ts).toLocaleDateString()},{' '}
                  {new Date(ev.ts).toLocaleTimeString()}
                </td>
                <td>
                  <span className="key-chip">{ev.sensor?.sensor_key ?? '—'}</span>
                </td>
                <td>{ev.sensor?.kind?.toLowerCase() ?? '—'}</td>
                <td>
                  <StatusPill value={ev.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      {events.length === 0 && !loading ? (
        <p className="muted-text" style={{ textAlign: 'center', marginTop: 16 }}>
          No events found.
        </p>
      ) : null}

      {loading ? (
        <p className="muted-text" style={{ textAlign: 'center', marginTop: 16 }}>
          Loading...
        </p>
      ) : null}

      {hasMore && !loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <PrimaryButton onClick={handleLoadMore}>Load More</PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}
