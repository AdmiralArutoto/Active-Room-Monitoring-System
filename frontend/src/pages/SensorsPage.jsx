import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import useWebSocket from '../hooks/useWebSocket';
import { useToast, useConfirm } from '../context/FeedbackContext';
import PageTitle from '../components/PageTitle';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import SearchFilterInput from '../components/SearchFilterInput';
import { GhostButton, PrimaryButton } from '../components/Button';
import TableShell from '../components/TableShell';
import StatusPill from '../components/StatusPill';
import ToggleSwitch from '../components/ToggleSwitch';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import iconTrash from '../assets/icons/Vector-trash.png';

const KINDS = ['MOTION', 'LIGHT'];
const emptyForm = { name: '', kind: 'MOTION', room_area_id: '', metadata: '' };

// Walk the SITE→BUILDING→FLOOR→ROOM tree into a flat list of ROOM options.
function flattenRooms(site) {
  const rooms = [];
  for (const b of site?.children || []) {
    for (const f of b.children || []) {
      for (const r of f.children || []) {
        if (r.type === 'ROOM') {
          rooms.push({ value: r.id, label: `${b.code}·${f.code}·${r.code} — ${r.name}` });
        }
      }
    }
  }
  return rooms;
}

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const sensorStates = useWebSocket();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  async function loadSensors() {
    try {
      setSensors(await api.get('/sensors'));
    } catch {
      setSensors([]);
    }
  }

  async function loadRooms() {
    try {
      const site = await api.get('/areas/site');
      if (!site) { setRooms([]); return; }
      const tree = await api.get(`/areas/${site.id}/tree`);
      setRooms(flattenRooms(tree));
    } catch {
      setRooms([]);
    }
  }

  useEffect(() => {
    loadSensors();
    loadRooms();
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
      toast.success('Sensor registered');
      await loadSensors();
    } catch (err) {
      setError(err.message || 'Failed to create sensor');
    }
  }

  async function handleToggleActive(sensor) {
    try {
      await api.patch(`/sensors/${sensor.id}/active`, { is_active: !sensor.is_active });
      await loadSensors();
    } catch (err) {
      toast.error(err.message || 'Failed to update sensor');
    }
  }

  async function handleDelete(sensor) {
    const ok = await confirm({
      title: 'Delete sensor',
      message: `Delete sensor "${sensor.name}"? Its event history will be removed.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/sensors/${sensor.id}`);
      toast.success('Sensor deleted');
      await loadSensors();
    } catch (err) {
      toast.error(err.message || 'Failed to delete sensor');
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

      {filtered.length > 0 ? (
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
      ) : (
        <EmptyState
          title="No sensors"
          description={sensors.length === 0
            ? 'Register your first sensor to start monitoring room activity.'
            : 'No sensors match your filter.'}
        />
      )}

      {showCreate ? (
        <Modal title="Register Sensor" onClose={() => setShowCreate(false)} maxWidth={520}>
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
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </label>

            <SelectInput
              label="Room"
              value={form.room_area_id}
              onChange={(e) => setForm((prev) => ({ ...prev, room_area_id: e.target.value }))}
              options={rooms}
              placeholder={rooms.length ? 'Select a room' : 'No rooms — create one on the dashboard first'}
              required
              disabled={rooms.length === 0}
            />

            <TextInput
              label="Metadata (JSON, optional)"
              value={form.metadata}
              onChange={(e) => setForm((prev) => ({ ...prev, metadata: e.target.value }))}
              placeholder='{"location":"ceiling"}'
            />

            <div className="modal-actions">
              <GhostButton type="button" onClick={() => setShowCreate(false)}>Cancel</GhostButton>
              <PrimaryButton type="submit" disabled={rooms.length === 0}>Register</PrimaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
