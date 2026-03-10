import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { colors, container } from '../styles/shared';
import iconTrash from '../assets/icons/Vector-trash.png';

const KINDS = ['MOTION', 'LIGHT'];
const emptyForm = { name: '', kind: 'MOTION', room_area_id: '', metadata: '' };

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);
  const [sensorStates, setSensorStates] = useState({});
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  async function load() {
    try { setSensors(await api.get('/sensors')); } catch {}
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let active = true;
    const poll = () => api.get('/api/states').then(data => { if (active) setSensorStates(data); }).catch(() => {});
    poll();
    const id = setInterval(poll, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

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
        name: form.name, kind: form.kind,
        room_area_id: form.room_area_id,
        metadata: parseMetadata(form.metadata),
      });
      setShowCreate(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleToggleActive(sensor) {
    try {
      await api.patch(`/sensors/${sensor.id}/active`, { is_active: !sensor.is_active });
      load();
    } catch {}
  }

  async function handleDelete(sensor) {
    if (!confirm(`Delete sensor "${sensor.name}"?`)) return;
    try { await api.delete(`/sensors/${sensor.id}`); load(); } catch {}
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const filtered = sensors.filter(s => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.sensor_key.toLowerCase().includes(q) || s.kind.toLowerCase().includes(q);
  });

  function getValueBadge(sensor) {
    const entry = sensorStates[sensor.sensor_key];
    if (!entry) return { text: '—', bg: colors.compBg, color: colors.textSecondary };
    const v = entry.state?.toLowerCase();
    if (v === 'on' || v === 'active' || v === 'detected') return { text: 'ON', bg: colors.sensorOn, color: '#fff' };
    if (v === 'off' || v === 'idle') return { text: 'OFF', bg: colors.actionOff, color: '#fff' };
    return { text: entry.state, bg: colors.compBg, color: colors.textPrime };
  }

  return (
    <div style={s.root}>
      <div style={s.cont}>
      <h2 style={s.pageTitle}>Sensors</h2>

      <div style={s.toolbar}>
        <div style={s.filterWrap}>
          <span style={s.filterIcon}>▼</span>
          <input style={s.filterInput} placeholder="Filter" value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <button style={s.createBtn} onClick={() => { setForm(emptyForm); setShowCreate(true); setError(null); }}>Create Sensor</button>
      </div>

      {showCreate && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <div style={s.modalHead}>
              <span style={{ fontWeight: 700, fontSize: 15, color: colors.textPrime }}>Register Sensor</span>
              <button style={s.modalClose} onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              {error && <p style={{ color: colors.remove, fontSize: 12, marginBottom: 8 }}>{error}</p>}
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
                <button style={s.submitBtn} type="submit">Register</button>
                <button style={s.cancelBtn} type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.headRow}>
              <th style={s.th}>KEY</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>SENSOR</th>
              <th style={s.th}>CREATED AT</th>
              <th style={s.th}>VALUE</th>
              <th style={s.th}>ACTIVE</th>
              <th style={s.th}>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sensor => {
              const badge = getValueBadge(sensor);
              return (
                <tr key={sensor.id} style={s.row}>
                  <td style={s.td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{sensor.sensor_key}</span></td>
                  <td style={s.td}>{sensor.name}</td>
                  <td style={s.td}>{sensor.kind.toLowerCase()}</td>
                  <td style={s.td}>{new Date(sensor.created_at).toLocaleDateString()}, {new Date(sensor.created_at).toLocaleTimeString()}</td>
                  <td style={s.td}>
                    <span style={{ padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>{badge.text}</span>
                  </td>
                  <td style={s.td}>
                    <div onClick={() => handleToggleActive(sensor)} style={{ ...s.toggle, background: sensor.is_active ? colors.action : colors.actionOff }}>
                      <div style={{ ...s.toggleKnob, left: sensor.is_active ? 18 : 2 }} />
                    </div>
                  </td>
                  <td style={s.td}>
                    <button onClick={() => handleDelete(sensor)} style={s.trashBtn}>
                      <img src={iconTrash} alt="Delete" style={{ width: 14, height: 14, opacity: 0.5 }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 32 }}>No sensors found.</p>}
      </div>
      </div>
    </div>
  );
}

const s = {
  root:       { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: 'system-ui, sans-serif', background: colors.pageBg, overflowY: 'auto' },
  cont:       { ...container.base, display: 'flex', flexDirection: 'column', paddingBottom: 20 },
  pageTitle:  { margin: '16px 0 12px', fontSize: 18, fontWeight: 700, color: colors.textPrime },

  toolbar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterWrap: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.white },
  filterIcon: { fontSize: 10, color: colors.textSecondary },
  filterInput:{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: colors.textPrime, width: 120 },
  createBtn:  { padding: '6px 14px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },

  tableWrap:  { overflowY: 'auto', background: colors.white, borderRadius: 10, border: `1px solid ${colors.border}` },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  headRow:    { background: colors.compBg },
  th:         { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${colors.border}` },
  row:        { borderBottom: `1px solid ${colors.border}` },
  td:         { padding: '10px 12px', color: colors.textPrime, fontSize: 13 },

  toggle:     { width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' },
  toggleKnob: { width: 16, height: 16, borderRadius: '50%', background: colors.white, position: 'absolute', top: 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },

  trashBtn:   { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox:     { background: colors.white, borderRadius: 10, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden' },
  modalHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` },
  modalClose:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: colors.textSecondary, lineHeight: 1 },
  modalForm:    { padding: 18 },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, color: colors.textPrime, marginBottom: 4 },
  input:        { display: 'block', width: '100%', padding: '7px 10px', fontSize: 13, border: `1px solid ${colors.border}`, borderRadius: 6, boxSizing: 'border-box', marginBottom: 12, background: colors.white },
  submitBtn:    { padding: '8px 18px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  cancelBtn:    { padding: '8px 18px', background: colors.compBg, color: colors.textPrime, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 },
};
