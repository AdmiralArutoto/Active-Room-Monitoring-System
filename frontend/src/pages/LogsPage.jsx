import { useEffect, useState } from 'react';
import { api } from '../api/client';
import useWebSocket from '../hooks/useWebSocket';
import { useToast } from '../context/FeedbackContext';
import PageTitle from '../components/PageTitle';
import EmptyState from '../components/EmptyState';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import TableShell from '../components/TableShell';
import StatusPill from '../components/StatusPill';

const LIMIT = 50;

// A picked "YYYY-MM-DD" is a calendar day in the user's *local* zone — the same
// zone the table renders timestamps in. Parse without a trailing "Z" so the day
// boundaries land in local time, then hand the backend a UTC instant. Using UTC
// midnight here instead would shift the window by the local offset and filter in
// events from the wrong day.
const dayStartISO = (d) => (d ? new Date(`${d}T00:00:00.000`).toISOString() : null);
const dayEndISO = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : null);

// Open the native calendar picker on interaction so the date can be picked
// rather than typed. Guarded because a click fires both focus and click, and
// calling showPicker() while the picker is already open can throw.
function openDatePicker(e) {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    /* picker already open */
  }
}

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [filters, setFilters] = useState({ sensor_id: '', from: '', to: '' });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/sensors').then(setSensors).catch(() => setSensors([]));
  }, []);

  useEffect(() => {
    fetchEvents(0, true, filters);
  }, []);

  // A date range is a historical query, not a live view: while one is active we
  // freeze the table so the stream can't keep injecting "now" rows on top of the
  // filtered results (which made the filter look ignored).
  const dateFilterActive = Boolean(filters.from || filters.to);

  // Live feed: prepend incoming state changes that match the active sensor.
  const sensorByKey = {};
  sensors.forEach((s) => { sensorByKey[s.sensor_key] = s; });

  useWebSocket((msg) => {
    if (dateFilterActive) return;
    if (filters.sensor_id && msg.sensor_id !== filters.sensor_id) return;
    const s = sensorByKey[msg.sensor_key];
    const row = {
      id: `live-${msg.sensor_key}-${msg.ts}`,
      ts: msg.ts,
      value: msg.state,
      sensor: { sensor_key: msg.sensor_key, kind: s?.kind ?? null, name: s?.name },
    };
    setEvents((prev) => (prev[0]?.id === row.id ? prev : [row, ...prev].slice(0, 500)));
  });

  async function fetchEvents(nextOffset, replace, activeFilters = filters) {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (activeFilters.sensor_id) params.set('sensor_id', activeFilters.sensor_id);
      if (activeFilters.from) params.set('from', dayStartISO(activeFilters.from));
      // include the whole selected end day (date inputs are midnight-only otherwise)
      if (activeFilters.to) params.set('to', dayEndISO(activeFilters.to));
      params.set('limit', LIMIT);
      params.set('offset', nextOffset);

      const data = await api.get(`/events?${params.toString()}`);
      setEvents((prev) => (replace ? data : [...prev, ...data]));
      setOffset(nextOffset);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      if (replace) setEvents([]);
      toast.error(err.message || 'Failed to load events');
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
            aria-label="From date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            onClick={openDatePicker}
            onFocus={openDatePicker}
          />

          <input
            type="date"
            className="date-input"
            aria-label="To date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            onClick={openDatePicker}
            onFocus={openDatePicker}
          />

          {dateFilterActive ? (
            <span className="muted-text" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              Live paused — filtered view
            </span>
          ) : null}
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
        <EmptyState
          title="No events"
          description={dateFilterActive || filters.sensor_id
            ? 'No state changes match the current filters.'
            : 'State changes will appear here as sensors report.'}
        />
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
