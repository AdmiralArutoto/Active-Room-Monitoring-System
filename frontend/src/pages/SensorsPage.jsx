import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import PageTitle from '../components/PageTitle';
import SearchFilterInput from '../components/SearchFilterInput';
import { GhostButton, PrimaryButton } from '../components/Button';
import TableShell from '../components/TableShell';
import StatusPill from '../components/StatusPill';
import ToggleSwitch from '../components/ToggleSwitch';
import TextInput from '../components/TextInput';
import iconTrash from '../assets/icons/Vector-trash.png';

const KINDS = ['MOTION', 'LIGHT'];
const emptyForm = { name: '', kind: 'MOTION', room_area_id: '', metadata: '' };

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);
  const [sensorStates, setSensorStates] = useState({});
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function loadSensors() {
    try {
      setSensors(await api.get('/sensors'));
    } catch {
      setSensors([]);
    }
  }

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    let active = true;

    const poll = () =>
      api
        .get('/api/states')
        .then((data) => {
          if (active) setSensorStates(data || {});
        })
        .catch(() => {});

    poll();
    const id = setInterval(poll, 5000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  function parseMetadata(raw) {
    if (!raw.trim()) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('metadata must be valid JSON');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');

    try {
      await api.post('/sensors', {
        name: form.name,
        kind: form.kind,
        room_area_id: form.room_area_id,
        metadata: parseMetadata(form.metadata),
      });

      setShowCreate(false);
      setForm(emptyForm);
      await loadSensors();
    } catch (err) {
      setError(err.message || 'Failed to create sensor');
    }
  }

  async function handleToggleActive(sensor) {
    try {
      await api.patch(`/sensors/${sensor.id}/active`, { is_active: !sensor.is_active });
      await loadSensors();
    } catch {
      // no-op
    }
  }

  async function handleDelete(sensor) {
    if (!confirm(`Delete sensor "${sensor.name}"?`)) return;

    try {
      await api.delete(`/sensors/${sensor.id}`);
      await loadSensors();
    } catch {
      // no-op
    }
  }

  const filtered = useMemo(() => {
    if (!filter) return sensors;
    const q = filter.toLowerCase();

    return sensors.filter((sensor) => {
      return (
        sensor.name.toLowerCase().includes(q) ||
        sensor.sensor_key.toLowerCase().includes(q) ||
        sensor.kind.toLowerCase().includes(q)
      );
    });
  }, [filter, sensors]);

  return (
    <div>
      <PageTitle>Sensors</PageTitle>

      <div className="toolbar" style={{ marginBottom: 8 }}>
        <SearchFilterInput value={filter} onChange={(e) => setFilter(e.target.value)} />
        <PrimaryButton
          onClick={() => {
            setForm(emptyForm);
            setError('');
            setShowCreate(true);
          }}
        >
          Create Sensor
        </PrimaryButton>
      </div>

      <TableShell>
        <table>
          <thead>
            <tr>
              <th>KEY</th>
              <th>Name</th>
              <th>SENSOR</th>
              <th>CREATED AT</th>
              <th>VALUE</th>
              <th>ACTIVE</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sensor) => {
              const value = sensorStates[sensor.sensor_key]?.state;
              return (
                <tr key={sensor.id}>
                  <td>
                    <span className="key-chip">{sensor.sensor_key}</span>
                  </td>
                  <td>{sensor.name}</td>
                  <td>{sensor.kind.toLowerCase()}</td>
                  <td>
                    {new Date(sensor.created_at).toLocaleDateString()},{' '}
                    {new Date(sensor.created_at).toLocaleTimeString()}
                  </td>
                  <td>
                    <StatusPill value={value} />
                  </td>
                  <td>
                    <ToggleSwitch
                      checked={sensor.is_active}
                      onChange={() => handleToggleActive(sensor)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete ${sensor.name}`}
                      onClick={() => handleDelete(sensor)}
                    >
                      <img src={iconTrash} alt="Delete" style={{ width: 15, height: 15, opacity: 0.45 }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      {filtered.length === 0 ? (
        <p className="muted-text" style={{ textAlign: 'center', marginTop: 16 }}>
          No sensors found.
        </p>
      ) : null}

      {showCreate ? (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-head">
              <span>Register Sensor</span>
              <button type="button" className="icon-button" onClick={() => setShowCreate(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleCreate} className="modal-grid">
                {error ? <p className="error-text">{error}</p> : null}

                <TextInput
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />

                <label className="modal-label">
                  <span>Kind</span>
                  <select
                    className="select"
                    value={form.kind}
                    onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value }))}
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </label>

                <TextInput
                  label="Room Area ID"
                  value={form.room_area_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, room_area_id: e.target.value }))}
                  placeholder="UUID of a ROOM area"
                  required
                />

                <TextInput
                  label="Metadata (JSON, optional)"
                  value={form.metadata}
                  onChange={(e) => setForm((prev) => ({ ...prev, metadata: e.target.value }))}
                  placeholder='{"location":"ceiling"}'
                />

                <div className="modal-actions">
                  <PrimaryButton type="submit">Register</PrimaryButton>
                  <GhostButton type="button" onClick={() => setShowCreate(false)}>
                    Cancel
                  </GhostButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
