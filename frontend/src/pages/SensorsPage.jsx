import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const KINDS = ['MOTION', 'LIGHT', 'TEMPERATURE', 'DOOR', 'OTHER'];

const emptyForm = { name: '', kind: 'MOTION', room_area_id: '', metadata: '' };

export default function SensorsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  function handleLogout() { logout(); navigate('/login'); }

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
    <div style={s.layout}>
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <span style={{ fontWeight: 700 }}>Sensors</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={s.btnSm} onClick={() => navigate('/areas')}>Areas</button>
            <button style={s.btnSm} onClick={openCreate}>+ New</button>
            <button style={{ ...s.btnSm, background: '#6b7280' }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <div style={{ padding: 8 }}>
          {sensors.length === 0 && <p style={s.muted}>No sensors registered.</p>}
          {sensors.map(sensor => (
            <div
              key={sensor.id}
              onClick={() => select(sensor)}
              style={{ ...s.row, background: selected?.id === sensor.id ? '#dbeafe' : 'transparent', opacity: sensor.is_active ? 1 : 0.45 }}
            >
              <span style={s.kindBadge(sensor.kind)}>{sensor.kind[0]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sensor.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{sensor.sensor_key}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.detail}>
        <div style={s.detailHeader}>
          <span style={{ color: '#6b7280', fontSize: 13 }}>Logged in as <strong>{user?.username}</strong></span>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} style={s.form}>
            <h3 style={{ marginTop: 0 }}>Register Sensor</h3>
            {error && <p style={s.err}>{error}</p>}
            <label style={s.label}>Name</label>
            <input style={s.input} value={form.name} onChange={f('name')} required />
            <label style={s.label}>Kind</label>
            <select style={s.input} value={form.kind} onChange={f('kind')}>
              {KINDS.map(k => <option key={k}>{k}</option>)}
            </select>
            <label style={s.label}>Room Area ID</label>
            <input style={s.input} value={form.room_area_id} onChange={f('room_area_id')} placeholder="UUID of a ROOM area" required />
            <label style={s.label}>Metadata (JSON, optional)</label>
            <input style={s.input} value={form.metadata} onChange={f('metadata')} placeholder='{"location":"ceiling"}' />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.btn} type="submit">Register</button>
              <button style={{ ...s.btn, background: '#6b7280' }} type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        {selected && !showCreate && (
          <div style={s.form}>
            {editMode ? (
              <form onSubmit={handleUpdate}>
                <h3 style={{ marginTop: 0 }}>Edit Sensor</h3>
                {error && <p style={s.err}>{error}</p>}
                <label style={s.label}>Name</label>
                <input style={s.input} value={form.name} onChange={f('name')} required />
                <label style={s.label}>Kind</label>
                <select style={s.input} value={form.kind} onChange={f('kind')}>
                  {KINDS.map(k => <option key={k}>{k}</option>)}
                </select>
                <label style={s.label}>Room Area ID</label>
                <input style={s.input} value={form.room_area_id} onChange={f('room_area_id')} />
                <label style={s.label}>Metadata (JSON)</label>
                <input style={s.input} value={form.metadata} onChange={f('metadata')} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btn} type="submit">Save</button>
                  <button style={{ ...s.btn, background: '#6b7280' }} type="button" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
                {error && <p style={s.err}>{error}</p>}
                <p style={s.meta}><strong>Key:</strong> {selected.sensor_key}</p>
                <p style={s.meta}><strong>Kind:</strong> {selected.kind}</p>
                <p style={s.meta}><strong>Status:</strong> {selected.is_active ? 'Active' : 'Inactive'}</p>
                {selected.room && <p style={s.meta}><strong>Room:</strong> {selected.room.name}</p>}
                {selected.metadata && (
                  <p style={s.meta}><strong>Metadata:</strong> <code>{JSON.stringify(selected.metadata)}</code></p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button style={s.btn} onClick={openEdit}>Edit</button>
                  <button style={{ ...s.btn, background: '#6b7280' }} onClick={handleToggleActive}>
                    {selected.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button style={{ ...s.btn, background: '#dc2626' }} onClick={handleDelete}>Delete</button>
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

const s = {
  layout:       { display: 'flex', height: '100vh', fontFamily: 'sans-serif' },
  sidebar:      { width: 280, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#f9fafb' },
  sidebarHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: 6 },
  detail:       { flex: 1, display: 'flex', flexDirection: 'column' },
  detailHeader: { padding: '12px 24px', borderBottom: '1px solid #e5e7eb' },
  form:         { padding: 24, maxWidth: 480 },
  label:        { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 },
  input:        { display: 'block', width: '100%', marginBottom: 14, padding: '7px 10px', fontSize: 14, boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 4 },
  btn:          { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  btnSm:        { padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  row:          { display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 4, cursor: 'pointer', marginBottom: 2 },
  muted:        { color: '#9ca3af', fontSize: 13 },
  err:          { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  meta:         { fontSize: 14, margin: '4px 0' },
  kindBadge:    (kind) => ({
    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, color: '#fff', flexShrink: 0,
    background: { MOTION: '#7c3aed', LIGHT: '#d97706', TEMPERATURE: '#0891b2', DOOR: '#059669', OTHER: '#6b7280' }[kind] ?? '#6b7280',
  }),
};
