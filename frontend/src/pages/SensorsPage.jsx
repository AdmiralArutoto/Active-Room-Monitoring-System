import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { sh } from '../styles/shared';

const KINDS = ['MOTION', 'LIGHT', 'TEMPERATURE', 'DOOR', 'OTHER'];

const emptyForm = { name: '', kind: 'MOTION', room_area_id: '', metadata: '' };

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  async function load() {
    try { setSensors(await api.get('/sensors')); }
    catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);

  function select(s) { setSelected(s); setEditMode(false); setShowCreate(false); setError(null); }

  function openCreate() {
    setForm(emptyForm);
    setShowCreate(true);
    setEditMode(false);
    setSelected(null);
    setError(null);
  }

  function openEdit() {
    setForm({
      sensor_key: selected.sensor_key,
      name: selected.name,
      kind: selected.kind,
      room_area_id: selected.room_area_id || '',
      metadata: selected.metadata ? JSON.stringify(selected.metadata) : '',
    });
    setEditMode(true);
    setShowCreate(false);
    setError(null);
  }

  function parseMetadata(raw) {
    if (!raw.trim()) return undefined;
    try { return JSON.parse(raw); }
    catch { throw new Error('metadata must be valid JSON'); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/sensors', {
        name: form.name,
        kind: form.kind,
        room_area_id: form.room_area_id,
        metadata: parseMetadata(form.metadata),
      });
      setShowCreate(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError(null);
    try {
      const updated = await api.put(`/sensors/${selected.id}`, {
        name: form.name,
        kind: form.kind,
        room_area_id: form.room_area_id || undefined,
        metadata: parseMetadata(form.metadata),
      });
      setSelected(updated);
      setEditMode(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleToggleActive() {
    setError(null);
    try {
      const updated = await api.patch(`/sensors/${selected.id}/active`, { is_active: !selected.is_active });
      setSelected(updated);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete() {
    if (!confirm(`Delete sensor "${selected.name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/sensors/${selected.id}`);
      setSelected(null);
      load();
    } catch (err) { setError(err.message); }
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div style={sh.layout}>
      <div style={sh.sidebar}>
        <div style={sh.sidebarHead}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Sensors</span>
          <button style={sh.btnSm} onClick={openCreate}>+ New</button>
        </div>
        <div style={{ padding: 8 }}>
          {sensors.length === 0 && <p style={sh.muted}>No sensors registered.</p>}
          {sensors.map(sensor => (
            <div
              key={sensor.id}
              onClick={() => select(sensor)}
              style={{ ...local.row, background: selected?.id === sensor.id ? '#dbeafe' : 'transparent', opacity: sensor.is_active ? 1 : 0.45 }}
            >
              <span style={local.kindBadge(sensor.kind)}>{sensor.kind[0]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sensor.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{sensor.sensor_key}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={sh.detail}>
        {showCreate && (
          <form onSubmit={handleCreate} style={sh.form}>
            <h3 style={{ marginTop: 0 }}>Register Sensor</h3>
            {error && <p style={sh.error}>{error}</p>}
            <label style={sh.label}>Name</label>
            <input style={sh.input} value={form.name} onChange={f('name')} required />
            <label style={sh.label}>Kind</label>
            <select style={sh.input} value={form.kind} onChange={f('kind')}>
              {KINDS.map(k => <option key={k}>{k}</option>)}
            </select>
            <label style={sh.label}>Room Area ID</label>
            <input style={sh.input} value={form.room_area_id} onChange={f('room_area_id')} placeholder="UUID of a ROOM area" required />
            <label style={sh.label}>Metadata (JSON, optional)</label>
            <input style={sh.input} value={form.metadata} onChange={f('metadata')} placeholder='{"location":"ceiling"}' />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={sh.btn} type="submit">Register</button>
              <button style={sh.btnGray} type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        {selected && !showCreate && (
          <div style={sh.form}>
            {editMode ? (
              <form onSubmit={handleUpdate}>
                <h3 style={{ marginTop: 0 }}>Edit Sensor</h3>
                {error && <p style={sh.error}>{error}</p>}
                <label style={sh.label}>Name</label>
                <input style={sh.input} value={form.name} onChange={f('name')} required />
                <label style={sh.label}>Kind</label>
                <select style={sh.input} value={form.kind} onChange={f('kind')}>
                  {KINDS.map(k => <option key={k}>{k}</option>)}
                </select>
                <label style={sh.label}>Room Area ID</label>
                <input style={sh.input} value={form.room_area_id} onChange={f('room_area_id')} />
                <label style={sh.label}>Metadata (JSON)</label>
                <input style={sh.input} value={form.metadata} onChange={f('metadata')} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={sh.btn} type="submit">Save</button>
                  <button style={sh.btnGray} type="button" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
                {error && <p style={sh.error}>{error}</p>}
                <p style={sh.meta}><strong>Key:</strong> {selected.sensor_key}</p>
                <p style={sh.meta}><strong>Kind:</strong> {selected.kind}</p>
                <p style={sh.meta}><strong>Status:</strong> {selected.is_active ? 'Active' : 'Inactive'}</p>
                {selected.room && <p style={sh.meta}><strong>Room:</strong> {selected.room.name}</p>}
                {selected.metadata && (
                  <p style={sh.meta}><strong>Metadata:</strong> <code>{JSON.stringify(selected.metadata)}</code></p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button style={sh.btn} onClick={openEdit}>Edit</button>
                  <button style={sh.btnGray} onClick={handleToggleActive}>
                    {selected.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button style={sh.btnRed} onClick={handleDelete}>Delete</button>
                </div>
              </>
            )}
          </div>
        )}

        {!selected && !showCreate && (
          <p style={{ color: '#9ca3af', marginTop: '2rem', textAlign: 'center' }}>Select a sensor or register a new one.</p>
        )}
      </div>
    </div>
  );
}

const local = {
  row:       { display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 4, cursor: 'pointer', marginBottom: 2 },
  kindBadge: (kind) => ({
    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, color: '#fff', flexShrink: 0,
    background: { MOTION: '#7c3aed', LIGHT: '#d97706', TEMPERATURE: '#0891b2', DOOR: '#059669', OTHER: '#6b7280' }[kind] ?? '#6b7280',
  }),
};
