import { useEffect, useState } from 'react';
import { api } from '../api/client';
import AreaTree from '../components/AreaTree';
import { sh } from '../styles/shared';

const AREA_TYPES = ['BUILDING', 'FLOOR', 'ROOM'];

export default function AreasPage() {
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
    <div style={sh.layout}>
      {/* Sidebar */}
      <div style={sh.sidebar}>
        <div style={sh.sidebarHead}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Areas</span>
          <button style={sh.btnSm} onClick={openCreate}>+ New</button>
        </div>
        <div style={{ padding: 8 }}>
          {error && <p style={sh.error}>{error}</p>}
          {roots.length === 0 && <p style={sh.muted}>No areas yet.</p>}
          {roots.map(area => (
            <AreaTree key={area.id} area={area} onSelect={selectArea} selectedId={selected?.id} />
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div style={sh.detail}>
        {showCreate && (
          <form onSubmit={handleCreate} style={sh.form}>
            <h3 style={{ marginTop: 0 }}>New Area</h3>
            {error && <p style={sh.error}>{error}</p>}
            <label style={sh.label}>Name</label>
            <input style={sh.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <label style={sh.label}>Type</label>
            <select style={sh.input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {AREA_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <label style={sh.label}>Parent ID (optional)</label>
            <input style={sh.input} value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} placeholder="Leave blank for BUILDING" />
            <label style={sh.label}>Code <span style={{ fontWeight: 400, color: '#6b7280' }}>(e.g. B02, F01, R103)</span></label>
            <input style={sh.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Short identifier for sensor key generation" />
            <label style={sh.label}>Description</label>
            <input style={sh.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={sh.btn} type="submit">Create</button>
              <button style={sh.btnGray} type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        {selected && !showCreate && (
          <div style={sh.form}>
            {editMode ? (
              <form onSubmit={handleUpdate}>
                <h3 style={{ marginTop: 0 }}>Edit Area</h3>
                {error && <p style={sh.error}>{error}</p>}
                <label style={sh.label}>Name</label>
                <input style={sh.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                <label style={sh.label}>Code</label>
                <input style={sh.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. B02, F01, R103" />
                <label style={sh.label}>Description</label>
                <input style={sh.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={sh.btn} type="submit">Save</button>
                  <button style={sh.btnGray} type="button" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
                <p style={sh.meta}><strong>ID:</strong> <code>{selected.id}</code></p>
                <p style={sh.meta}><strong>Type:</strong> {selected.type}</p>
                <p style={sh.meta}><strong>Code:</strong> {selected.code ?? <span style={{ color: '#9ca3af' }}>not set</span>}</p>
                <p style={sh.meta}><strong>Status:</strong> {selected.is_active ? 'Active' : 'Inactive'}</p>
                {selected.description && <p style={sh.meta}><strong>Description:</strong> {selected.description}</p>}
                {error && <p style={sh.error}>{error}</p>}
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
          <p style={{ color: '#9ca3af', marginTop: '2rem', textAlign: 'center' }}>Select an area or create a new one.</p>
        )}
      </div>
    </div>
  );
}
