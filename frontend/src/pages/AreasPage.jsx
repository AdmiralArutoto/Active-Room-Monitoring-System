import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { sh } from '../styles/shared';

export default function AreasPage() {
  // Buildings list
  const [buildings, setBuildings] = useState([]);
  const [selected, setSelected] = useState(null);

  // Floors and rooms for selected building
  const [floors, setFloors] = useState([]);
  const [roomsByFloor, setRoomsByFloor] = useState({}); // { [floorId]: Room[] }

  // Building CRUD state
  const [editingBuilding, setEditingBuilding] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', description: '' });
  const [showNewBuilding, setShowNewBuilding] = useState(false);
  const [newBuildingForm, setNewBuildingForm] = useState({ name: '', code: '' });

  // Inline floor / room creation state
  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorCode, setNewFloorCode] = useState('');
  const [addingRoomForFloor, setAddingRoomForFloor] = useState(null); // floorId | null
  const [newRoomCode, setNewRoomCode] = useState('');

  // Separate error surfaces for each panel section
  const [buildingError, setBuildingError] = useState(null);
  const [floorRoomError, setFloorRoomError] = useState(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadBuildings() {
    try {
      const data = await api.get('/areas');
      setBuildings(data.filter(a => a.type === 'BUILDING'));
    } catch (err) { setBuildingError(err.message); }
  }

  async function loadFloorsAndRooms(buildingId) {
    try {
      const floorData = await api.get(`/areas/${buildingId}/children`);
      const floorList = floorData
        .filter(a => a.type === 'FLOOR')
        .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
      setFloors(floorList);

      const roomMap = {};
      await Promise.all(floorList.map(async floor => {
        const rooms = await api.get(`/areas/${floor.id}/children`);
        roomMap[floor.id] = rooms
          .filter(a => a.type === 'ROOM')
          .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
      }));
      setRoomsByFloor(roomMap);
    } catch (err) { setFloorRoomError(err.message); }
  }

  useEffect(() => { loadBuildings(); }, []);

  // ── Building actions ──────────────────────────────────────────────────────

  async function selectBuilding(building) {
    setSelected(building);
    setEditingBuilding(false);
    setAddingFloor(false);
    setAddingRoomForFloor(null);
    setBuildingError(null);
    setFloorRoomError(null);
    await loadFloorsAndRooms(building.id);
  }

  async function handleCreateBuilding(e) {
    e.preventDefault();
    setBuildingError(null);
    try {
      const building = await api.post('/areas', {
        name: newBuildingForm.name,
        type: 'BUILDING',
        code: newBuildingForm.code || undefined,
      });
      setNewBuildingForm({ name: '', code: '' });
      setShowNewBuilding(false);
      await loadBuildings();
      selectBuilding(building);
    } catch (err) { setBuildingError(err.message); }
  }

  async function handleUpdateBuilding(e) {
    e.preventDefault();
    setBuildingError(null);
    try {
      const updated = await api.put(`/areas/${selected.id}`, {
        name: buildingForm.name,
        code: buildingForm.code || undefined,
        description: buildingForm.description || undefined,
      });
      setSelected(updated);
      setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
      setEditingBuilding(false);
    } catch (err) { setBuildingError(err.message); }
  }

  async function handleToggleBuildingActive() {
    setBuildingError(null);
    try {
      const updated = await api.patch(`/areas/${selected.id}/active`, { is_active: !selected.is_active });
      setSelected(updated);
      setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
    } catch (err) { setBuildingError(err.message); }
  }

  async function handleDeleteBuilding() {
    if (!confirm(`Delete building "${selected.name}"? All floors and rooms must be removed first.`)) return;
    setBuildingError(null);
    try {
      await api.delete(`/areas/${selected.id}`);
      setSelected(null);
      setFloors([]);
      setRoomsByFloor({});
      loadBuildings();
    } catch (err) { setBuildingError(err.message); }
  }

  function openEditBuilding() {
    setBuildingForm({
      name: selected.name,
      code: selected.code ?? '',
      description: selected.description ?? '',
    });
    setEditingBuilding(true);
  }

  // ── Floor actions ─────────────────────────────────────────────────────────

  async function handleCreateFloor() {
    if (!newFloorCode.trim()) return;
    setFloorRoomError(null);
    try {
      await api.post('/areas', {
        name: newFloorCode.trim(),
        type: 'FLOOR',
        parent_id: selected.id,
        code: newFloorCode.trim(),
      });
      setNewFloorCode('');
      setAddingFloor(false);
      await loadFloorsAndRooms(selected.id);
    } catch (err) { setFloorRoomError(err.message); }
  }

  async function handleDeleteFloor(floor) {
    if (!confirm(`Delete floor "${floor.code}"? All rooms must be removed first.`)) return;
    setFloorRoomError(null);
    try {
      await api.delete(`/areas/${floor.id}`);
      await loadFloorsAndRooms(selected.id);
    } catch (err) { setFloorRoomError(err.message); }
  }

  // ── Room actions ──────────────────────────────────────────────────────────

  async function handleCreateRoom(floor) {
    if (!newRoomCode.trim()) return;
    setFloorRoomError(null);
    try {
      await api.post('/areas', {
        name: newRoomCode.trim(),
        type: 'ROOM',
        parent_id: floor.id,
        code: newRoomCode.trim(),
      });
      setNewRoomCode('');
      setAddingRoomForFloor(null);
      await loadFloorsAndRooms(selected.id);
    } catch (err) { setFloorRoomError(err.message); }
  }

  async function handleDeleteRoom(room) {
    setFloorRoomError(null);
    try {
      await api.delete(`/areas/${room.id}`);
      await loadFloorsAndRooms(selected.id);
    } catch (err) { setFloorRoomError(err.message); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={sh.layout}>

      {/* ── Sidebar: buildings only ── */}
      <div style={sh.sidebar}>
        <div style={sh.sidebarHead}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Buildings</span>
          <button style={sh.btnSm} onClick={() => { setShowNewBuilding(v => !v); setBuildingError(null); }}>
            + New
          </button>
        </div>

        {showNewBuilding && (
          <form onSubmit={handleCreateBuilding} style={p.inlineForm}>
            <input
              style={p.compactInput}
              placeholder="Name"
              value={newBuildingForm.name}
              onChange={e => setNewBuildingForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
              required
            />
            <input
              style={p.compactInput}
              placeholder="Code (e.g. B01)"
              value={newBuildingForm.code}
              onChange={e => setNewBuildingForm(f => ({ ...f, code: e.target.value }))}
            />
            {buildingError && !selected && <p style={sh.error}>{buildingError}</p>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={sh.btnSm} type="submit">Create</button>
              <button style={sh.btnSmGray} type="button" onClick={() => { setShowNewBuilding(false); setBuildingError(null); }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ padding: '4px 8px' }}>
          {buildings.length === 0 && <p style={sh.muted}>No buildings yet.</p>}
          {buildings.map(b => (
            <div
              key={b.id}
              onClick={() => selectBuilding(b)}
              style={{ ...p.buildingRow, background: selected?.id === b.id ? '#dbeafe' : 'transparent', opacity: b.is_active ? 1 : 0.5 }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
              {b.code && <span style={p.codeTag}>{b.code}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail pane ── */}
      <div style={sh.detail}>
        {!selected ? (
          <p style={{ color: '#9ca3af', marginTop: '2rem', textAlign: 'center' }}>
            Select a building or create a new one.
          </p>
        ) : (
          <div style={{ padding: 24, maxWidth: 680 }}>

            {/* ── Building info ── */}
            <div style={p.section}>
              {editingBuilding ? (
                <form onSubmit={handleUpdateBuilding}>
                  <h3 style={{ marginTop: 0 }}>Edit Building</h3>
                  {buildingError && <p style={sh.error}>{buildingError}</p>}
                  <label style={sh.label}>Name</label>
                  <input style={sh.input} value={buildingForm.name} onChange={e => setBuildingForm(f => ({ ...f, name: e.target.value }))} required />
                  <label style={sh.label}>Code</label>
                  <input style={sh.input} value={buildingForm.code} onChange={e => setBuildingForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. B01" />
                  <label style={sh.label}>Description</label>
                  <input style={sh.input} value={buildingForm.description} onChange={e => setBuildingForm(f => ({ ...f, description: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={sh.btn} type="submit">Save</button>
                    <button style={sh.btnGray} type="button" onClick={() => setEditingBuilding(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <h3 style={{ marginTop: 0, marginBottom: 8 }}>{selected.name}</h3>
                  <p style={sh.meta}><strong>Code:</strong> {selected.code ?? <span style={{ color: '#9ca3af' }}>not set</span>}</p>
                  <p style={sh.meta}><strong>Status:</strong> {selected.is_active ? 'Active' : 'Inactive'}</p>
                  {selected.description && <p style={sh.meta}><strong>Description:</strong> {selected.description}</p>}
                  {buildingError && <p style={sh.error}>{buildingError}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button style={sh.btn} onClick={openEditBuilding}>Edit</button>
                    <button style={sh.btnGray} onClick={handleToggleBuildingActive}>
                      {selected.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button style={sh.btnRed} onClick={handleDeleteBuilding}>Delete</button>
                  </div>
                </>
              )}
            </div>

            {/* ── Floors & Rooms ── */}
            <div>
              <h4 style={p.sectionTitle}>Floors & Rooms</h4>

              {floors.length === 0 && !addingFloor && (
                <p style={{ ...sh.muted, marginBottom: 12 }}>No floors yet.</p>
              )}

              {floors.map(floor => (
                <div key={floor.id} style={p.floorCard}>
                  <div style={p.floorHeader}>
                    <span style={p.floorLabel}>{floor.code}</span>
                    <button style={p.iconBtn} onClick={() => handleDeleteFloor(floor)} title="Delete floor">×</button>
                  </div>

                  <div style={p.roomList}>
                    {(roomsByFloor[floor.id] ?? []).map(room => (
                      <div key={room.id} style={p.roomRow}>
                        <span style={{ fontSize: 13 }}>{room.code}</span>
                        <button style={p.iconBtn} onClick={() => handleDeleteRoom(room)} title="Delete room">×</button>
                      </div>
                    ))}

                    {addingRoomForFloor === floor.id ? (
                      <div style={p.inlineRowForm}>
                        <input
                          style={p.codeInput}
                          placeholder="Room code (e.g. R101)"
                          value={newRoomCode}
                          onChange={e => setNewRoomCode(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCreateRoom(floor); }
                            if (e.key === 'Escape') { setAddingRoomForFloor(null); setNewRoomCode(''); }
                          }}
                        />
                        <button style={sh.btnSm} onClick={() => handleCreateRoom(floor)}>Add</button>
                        <button style={sh.btnSmGray} onClick={() => { setAddingRoomForFloor(null); setNewRoomCode(''); }}>✕</button>
                      </div>
                    ) : (
                      <button
                        style={p.addBtn}
                        onClick={() => { setAddingRoomForFloor(floor.id); setNewRoomCode(''); setAddingFloor(false); }}
                      >
                        + Add Room
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add floor row */}
              {addingFloor ? (
                <div style={p.inlineRowForm}>
                  <input
                    style={p.codeInput}
                    placeholder="Floor code (e.g. F01)"
                    value={newFloorCode}
                    onChange={e => setNewFloorCode(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleCreateFloor(); }
                      if (e.key === 'Escape') { setAddingFloor(false); setNewFloorCode(''); }
                    }}
                  />
                  <button style={sh.btnSm} onClick={handleCreateFloor}>Add</button>
                  <button style={sh.btnSmGray} onClick={() => { setAddingFloor(false); setNewFloorCode(''); }}>✕</button>
                </div>
              ) : (
                <button
                  style={{ ...p.addBtn, marginTop: floors.length > 0 ? 8 : 0 }}
                  onClick={() => { setAddingFloor(true); setAddingRoomForFloor(null); }}
                >
                  + Add Floor
                </button>
              )}

              {floorRoomError && <p style={{ ...sh.error, marginTop: 10 }}>{floorRoomError}</p>}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

const p = {
  // Sidebar
  inlineForm:    { padding: '10px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' },
  compactInput:  { display: 'block', width: '100%', marginBottom: 8, padding: '5px 8px', fontSize: 13, boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 4 },
  buildingRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 4, cursor: 'pointer', marginBottom: 2 },
  codeTag:       { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#e5e7eb', color: '#374151' },

  // Detail
  section:       { marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #f3f4f6' },
  sectionTitle:  { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', margin: '0 0 12px 0' },

  // Floor cards
  floorCard:     { border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8, overflow: 'hidden' },
  floorHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' },
  floorLabel:    { fontSize: 13, fontWeight: 700, color: '#374151' },
  roomList:      { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  roomRow:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 4, background: '#f9fafb' },

  // Shared inline actions
  iconBtn:       { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: '0 2px' },
  addBtn:        { background: 'none', border: '1px dashed #d1d5db', borderRadius: 4, color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: '4px 12px' },
  inlineRowForm: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 },
  codeInput:     { padding: '4px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, flex: 1, minWidth: 0 },
};
