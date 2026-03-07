import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AreaTree from '../components/AreaTree';

const AREA_TYPES = ['BUILDING', 'FLOOR', 'ROOM'];

export default function AreasPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [roots, setRoots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'BUILDING', parent_id: '', description: '', code: '' });
  const [error, setError] = useState(null);

  async function loadRoots() {
    try {
      const data = await api.get('/areas');
      setRoots(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadRoots(); }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function selectArea(area) {
    setSelected(area);
    setEditMode(false);
    setShowCreate(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/areas', {
        name: form.name,
        type: form.type,
        parent_id: form.parent_id || undefined,
        description: form.description || undefined,
        code: form.code || undefined,
      });
      setShowCreate(false);
      setForm({ name: '', type: 'BUILDING', parent_id: '', description: '', code: '' });
      loadRoots();
    } catch (err) { setError(err.message); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError(null);
    try {
      const updated = await api.put(`/areas/${selected.id}`, {
        name: form.name,
        code: form.code || undefined,
        description: form.description || undefined,
      });
      setSelected(updated);
      setEditMode(false);
      loadRoots();
    } catch (err) { setError(err.message); }
  }

  async function handleToggleActive() {
    setError(null);
    try {
      const updated = await api.patch(`/areas/${selected.id}/active`, { is_active: !selected.is_active });
      setSelected(updated);
      loadRoots();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${selected.name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/areas/${selected.id}`);
      setSelected(null);
      loadRoots();
    } catch (err) { setError(err.message); }
  }

  function openEdit() {
    setForm({ name: selected.name, type: selected.type, parent_id: selected.parent_id || '', description: selected.description || '', code: selected.code || '' });
    setEditMode(true);
    setShowCreate(false);
  }

  function openCreate() {
    setForm({ name: '', type: 'BUILDING', parent_id: '', description: '', code: '' });
    setShowCreate(true);
    setEditMode(false);
  }

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontWeight: 700 }}>Areas</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btnSmall} onClick={openCreate}>+ New</button>
            <button style={styles.btnSmall} onClick={() => navigate('/sensors')}>Sensors</button>
            <button style={{ ...styles.btnSmall, background: '#6b7280' }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <div style={{ padding: 8 }}>
          {error && <p style={styles.error}>{error}</p>}
          {roots.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No areas yet.</p>}
          {roots.map(area => (
            <AreaTree key={area.id} area={area} onSelect={selectArea} selectedId={selected?.id} />
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div style={styles.detail}>
        <div style={styles.detailHeader}>
          <span style={{ color: '#6b7280', fontSize: 13 }}>Logged in as <strong>{user?.username}</strong></span>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} style={styles.form}>
            <h3 style={{ marginTop: 0 }}>New Area</h3>
            {error && <p style={styles.error}>{error}</p>}
            <label style={styles.label}>Name</label>
            <input style={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <label style={styles.label}>Type</label>
            <select style={styles.input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {AREA_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={styles.label}>Parent ID (optional)</label>
            <input style={styles.input} value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} placeholder="Leave blank for BUILDING" />
            <label style={styles.label}>Code <span style={{ fontWeight: 400, color: '#6b7280' }}>(e.g. B02, F01, R103)</span></label>
            <input style={styles.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Short identifier for sensor key generation" />
            <label style={styles.label}>Description</label>
            <input style={styles.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.btn} type="submit">Create</button>
              <button style={{ ...styles.btn, background: '#6b7280' }} type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        {selected && !showCreate && (
          <div style={styles.form}>
            {editMode ? (
              <form onSubmit={handleUpdate}>
                <h3 style={{ marginTop: 0 }}>Edit Area</h3>
                {error && <p style={styles.error}>{error}</p>}
                <label style={styles.label}>Name</label>
                <input style={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                <label style={styles.label}>Code</label>
                <input style={styles.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. B02, F01, R103" />
                <label style={styles.label}>Description</label>
                <input style={styles.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={styles.btn} type="submit">Save</button>
                  <button style={{ ...styles.btn, background: '#6b7280' }} type="button" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
                <p style={styles.meta}><strong>ID:</strong> <code>{selected.id}</code></p>
                <p style={styles.meta}><strong>Type:</strong> {selected.type}</p>
                <p style={styles.meta}><strong>Code:</strong> {selected.code ?? <span style={{ color: '#9ca3af' }}>not set</span>}</p>
                <p style={styles.meta}><strong>Status:</strong> {selected.is_active ? 'Active' : 'Inactive'}</p>
                {selected.description && <p style={styles.meta}><strong>Description:</strong> {selected.description}</p>}
                {error && <p style={styles.error}>{error}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button style={styles.btn} onClick={openEdit}>Edit</button>
                  <button style={{ ...styles.btn, background: '#6b7280' }} onClick={handleToggleActive}>
                    {selected.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button style={{ ...styles.btn, background: '#dc2626' }} onClick={handleDelete}>Delete</button>
                </div>
              </>
            )}
          </div>
        )}

        {!selected && !showCreate && (
          <p style={{ color: '#9ca3af', marginTop: '2rem', textAlign: 'center' }}>Select an area or create a new one.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout:        { display: 'flex', height: '100vh', fontFamily: 'sans-serif' },
  sidebar:       { width: 280, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#f9fafb' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px', borderBottom: '1px solid #e5e7eb' },
  detail:        { flex: 1, display: 'flex', flexDirection: 'column' },
  detailHeader:  { padding: '12px 24px', borderBottom: '1px solid #e5e7eb' },
  form:          { padding: 24, maxWidth: 480 },
  label:         { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 },
  input:         { display: 'block', width: '100%', marginBottom: 14, padding: '7px 10px', fontSize: 14, boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 4 },
  btn:           { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  btnSmall:      { padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  error:         { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  meta:          { fontSize: 14, margin: '4px 0' },
};
