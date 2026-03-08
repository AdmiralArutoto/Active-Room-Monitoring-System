import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Rect, Text } from 'react-konva';
import { api } from '../api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Icon dimensions ───────────────────────────────────────────────────────────
const ICON_W = 80;
const ICON_H = 36;

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={m.overlay}>
      <div style={m.box}>
        <div style={m.head}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Area icon on canvas ───────────────────────────────────────────────────────
function AreaIcon({ area, color, draggable, onDragEnd, onClick }) {
  return (
    <Group
      x={area.map_x}
      y={area.map_y}
      draggable={draggable}
      onDragEnd={e => onDragEnd(area, e.target.x(), e.target.y())}
      onClick={() => onClick(area)}
    >
      <Rect
        width={ICON_W}
        height={ICON_H}
        fill={color}
        cornerRadius={4}
        shadowBlur={4}
        shadowOpacity={0.2}
        shadowOffsetY={2}
      />
      <Text
        text={area.name}
        width={ICON_W}
        height={ICON_H}
        align="center"
        verticalAlign="middle"
        fontSize={11}
        fontStyle="bold"
        fill="#fff"
        listening={false}
      />
    </Group>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // Site
  const [site, setSite] = useState(null);
  const [siteLoaded, setSiteLoaded] = useState(false);

  // Area tree
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Selection
  const [selBuilding, setSelBuilding] = useState(null);
  const [selFloor, setSelFloor] = useState(null);
  const [selRoom, setSelRoom] = useState(null);

  // Canvas image
  const [bgImage, setBgImage] = useState(null);
  const [imgNatural, setImgNatural] = useState(null); // { w, h }
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Placement mode: null | 'click' (new icon) | 'drag' (move existing icon)
  const [placingMode, setPlacingMode] = useState(null);
  const [placingArea, setPlacingArea] = useState(null);

  // Modal state: null | 'site' | 'building' | 'floor' | 'room'
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState(null);

  // Form fields (modal)
  const [form, setForm] = useState({ name: '', code: '', description: '', file: null });

  // Card editing
  const [editingCard, setEditingCard] = useState(null); // 'building' | 'floor' | 'room' | null
  const [cardForm, setCardForm] = useState({ name: '', code: '' });
  const [cardError, setCardError] = useState(null);

  // Card info panel
  const [infoCard, setInfoCard] = useState(null); // 'building' | 'floor' | 'room' | null
  const [infoSensors, setInfoSensors] = useState([]);

  // ── Resize observer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Load site on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/areas/site').then(data => {
      setSite(data);
      setSiteLoaded(true);
      if (data) loadBuildings(data.id);
    }).catch(() => setSiteLoaded(true));
  }, []);

  // ── Load map image ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Determine which area owns the current map
    const mapArea = selFloor ?? site;
    if (!mapArea?.image_path) { setBgImage(null); setImgNatural(null); return; }
    const img = new window.Image();
    img.src = `${API_URL}/uploads/${mapArea.image_path}`;
    img.onload = () => { setBgImage(img); setImgNatural({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { setBgImage(null); setImgNatural(null); };
  }, [site, selFloor]);

  // ── Data loaders ─────────────────────────────────────────────────────────────
  async function loadBuildings(siteId) {
    const data = await api.get(`/areas/${siteId}/children`);
    setBuildings(data.filter(a => a.type === 'BUILDING'));
  }

  async function loadFloors(buildingId) {
    const data = await api.get(`/areas/${buildingId}/children`);
    setFloors(data.filter(a => a.type === 'FLOOR'));
    setRooms([]);
  }

  async function loadRooms(floorId) {
    const data = await api.get(`/areas/${floorId}/children`);
    setRooms(data.filter(a => a.type === 'ROOM'));
  }

  // ── Selection handlers ───────────────────────────────────────────────────────
  async function handleSelectBuilding(e) {
    const id = e.target.value;
    if (!id) { setSelBuilding(null); setSelFloor(null); setSelRoom(null); setFloors([]); setRooms([]); return; }
    if (id === '__create__') { openModal('building'); return; }
    const b = buildings.find(x => x.id === id);
    setSelBuilding(b);
    setSelFloor(null);
    setSelRoom(null);
    setRooms([]);
    await loadFloors(b.id);
  }

  async function handleSelectFloor(e) {
    const id = e.target.value;
    if (!id) { setSelFloor(null); setSelRoom(null); setRooms([]); return; }
    if (id === '__create__') { openModal('floor'); return; }
    const f = floors.find(x => x.id === id);
    setSelFloor(f);
    setSelRoom(null);
    await loadRooms(f.id);
  }

  function handleSelectRoom(e) {
    const id = e.target.value;
    if (!id) { setSelRoom(null); return; }
    if (id === '__create__') { openModal('room'); return; }
    setSelRoom(rooms.find(x => x.id === id));
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openModal(type) {
    setModal(type);
    setForm({ name: '', code: '', description: '', file: null });
    setModalError(null);
  }

  function closeModal() {
    setModal(null);
    setModalError(null);
    setPlacingMode(null);
    setPlacingArea(null);
  }

  // ── Create site ──────────────────────────────────────────────────────────────
  async function handleCreateSite(e) {
    e.preventDefault();
    if (!form.file) { setModalError('Map image is required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', { name: form.name.trim(), type: 'SITE' });
      const fd = new FormData();
      fd.append('image', form.file);
      const updated = await api.upload(`/areas/${created.id}/image`, fd);
      setSite(updated);
      closeModal();
      loadBuildings(updated.id);
    } catch (err) { setModalError(err.message); }
  }

  // ── Create building (form step, then placement) ───────────────────────────────
  async function handleCreateBuilding(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setModalError('Name and code are required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', {
        name: form.name.trim(),
        code: form.code.trim(),
        type: 'BUILDING',
        parent_id: site.id,
        description: form.description.trim() || undefined,
      });
      setModal(null);
      setPlacingArea(created);
      setPlacingMode('click');
    } catch (err) { setModalError(err.message); }
  }

  // ── Create floor (form step, then file upload) ───────────────────────────────
  async function handleCreateFloor(e) {
    e.preventDefault();
    if (!form.code.trim()) { setModalError('Code is required'); return; }
    if (!form.file) { setModalError('Map image is required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', {
        name: form.code.trim(),
        code: form.code.trim(),
        type: 'FLOOR',
        parent_id: selBuilding.id,
        description: form.description.trim() || undefined,
      });
      const fd = new FormData();
      fd.append('image', form.file);
      await api.upload(`/areas/${created.id}/image`, fd);
      closeModal();
      await loadFloors(selBuilding.id);
    } catch (err) { setModalError(err.message); }
  }

  // ── Create room (form step, then placement) ───────────────────────────────────
  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setModalError('Name and code are required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', {
        name: form.name.trim(),
        code: form.code.trim(),
        type: 'ROOM',
        parent_id: selFloor.id,
        description: form.description.trim() || undefined,
      });
      setModal(null);
      setPlacingArea(created);
      setPlacingMode('click');
    } catch (err) { setModalError(err.message); }
  }

  // ── Canvas click — place icon ─────────────────────────────────────────────────
  async function handleStageClick(e) {
    if (placingMode !== 'click' || !placingArea) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const scale = stageScale();
    const x = pos.x / scale - ICON_W / 2;
    const y = pos.y / scale - ICON_H / 2;
    try {
      const updated = await api.patch(`/areas/${placingArea.id}/position`, { map_x: x, map_y: y });
      setPlacingMode(null);
      if (placingArea.type === 'BUILDING') {
        setBuildings(prev => [...prev.filter(b => b.id !== updated.id), updated]);
        setSelBuilding(updated);
        await loadFloors(updated.id);
      } else if (placingArea.type === 'ROOM') {
        setRooms(prev => [...prev.filter(r => r.id !== updated.id), updated]);
        setSelRoom(updated);
      }
      setPlacingArea(null);
    } catch (err) { console.error(err); }
  }

  // ── Drag end — update position ────────────────────────────────────────────────
  async function handleDragEnd(area, x, y) {
    try {
      const updated = await api.patch(`/areas/${area.id}/position`, { map_x: x, map_y: y });
      if (area.type === 'BUILDING') setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
      if (area.type === 'ROOM') setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
      setPlacingMode(null);
      setPlacingArea(null);
    } catch (err) { console.error(err); }
  }

  // ── Card edit/delete handlers ─────────────────────────────────────────────────
  function openCardEdit(type, area) {
    setEditingCard(type);
    setCardForm({ name: area.name ?? '', code: area.code ?? '' });
    setCardError(null);
  }

  async function handleSaveCard(e, type) {
    e.preventDefault();
    setCardError(null);
    try {
      const target = type === 'building' ? selBuilding : type === 'floor' ? selFloor : selRoom;
      const updated = await api.put(`/areas/${target.id}`, { name: cardForm.name, code: cardForm.code || undefined });
      if (type === 'building') { setSelBuilding(updated); setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b)); }
      if (type === 'floor') { setSelFloor(updated); setFloors(prev => prev.map(f => f.id === updated.id ? updated : f)); }
      if (type === 'room') { setSelRoom(updated); setRooms(prev => prev.map(r => r.id === updated.id ? updated : r)); }
      setEditingCard(null);
    } catch (err) { setCardError(err.message); }
  }

  async function handleDeleteCard(type) {
    const target = type === 'building' ? selBuilding : type === 'floor' ? selFloor : selRoom;
    if (!confirm(`Delete ${type} "${target.name}"?`)) return;
    try {
      await api.delete(`/areas/${target.id}`);
      if (type === 'room') { setSelRoom(null); setRooms(prev => prev.filter(r => r.id !== target.id)); }
      else if (type === 'floor') {
        setSelFloor(null); setSelRoom(null); setRooms([]);
        setFloors(prev => prev.filter(f => f.id !== target.id));
      } else {
        setSelBuilding(null); setSelFloor(null); setSelRoom(null); setFloors([]); setRooms([]);
        setBuildings(prev => prev.filter(b => b.id !== target.id));
      }
    } catch (err) { alert(err.message); }
  }

  function handleMoveIcon(type) {
    const target = type === 'building' ? selBuilding : selRoom;
    setPlacingArea(target);
    setPlacingMode('drag');
  }

  async function openCardInfo(type, area) {
    setInfoCard(type);
    setEditingCard(null);
    try {
      const all = await api.get('/sensors');
      const matchIds = type === 'room'
        ? [area.id]
        : rooms.map(r => r.id);
      setInfoSensors(all.filter(s => matchIds.includes(s.room_area_id)));
    } catch { setInfoSensors([]); }
  }

  // ── Canvas scale helpers ──────────────────────────────────────────────────────
  function stageScale() {
    if (!imgNatural) return 1;
    return Math.min(containerSize.w / imgNatural.w, containerSize.h / imgNatural.h, 1);
  }

  const scale = stageScale();
  const stageW = imgNatural ? imgNatural.w * scale : containerSize.w;
  const stageH = imgNatural ? imgNatural.h * scale : containerSize.h;

  // ── Which icons to show ───────────────────────────────────────────────────────
  // Site map: show building icons. Floor map: show room icons.
  const showBuildings = !selFloor;
  const showRooms = !!selFloor;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={d.root}>

      {/* ── Top bar: controls + site action ── */}
      {site && (
        <div style={d.topBar}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Building dropdown */}
            <select style={d.select} value={selBuilding?.id ?? ''} onChange={handleSelectBuilding}>
              <option value="">— Building —</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="__create__">+ Create Building</option>
            </select>

            {/* Floor dropdown */}
            {selBuilding && (
              <select style={d.select} value={selFloor?.id ?? ''} onChange={handleSelectFloor}>
                <option value="">— Floor —</option>
                {floors.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}
                <option value="__create__">+ Create Floor</option>
              </select>
            )}

            {/* Room dropdown */}
            {selFloor && (
              <select style={d.select} value={selRoom?.id ?? ''} onChange={handleSelectRoom}>
                <option value="">— Room —</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                <option value="__create__">+ Create Room</option>
              </select>
            )}
          </div>

          {/* Site action button */}
          <button
            style={d.siteBtn}
            onClick={() => { setSelBuilding(null); setSelFloor(null); setSelRoom(null); setFloors([]); setRooms([]); }}
          >
            {site.name}
          </button>
        </div>
      )}

      {/* ── Map area ── */}
      <div ref={containerRef} style={{ ...d.mapArea, cursor: placingMode === 'click' ? 'crosshair' : 'default' }}>
        {!siteLoaded ? null
          : !site ? (
            <div style={d.empty}>
              <p style={{ color: '#9ca3af', marginBottom: 16 }}>No site configured.</p>
              <button style={d.createSiteBtn} onClick={() => openModal('site')}>Create Site</button>
            </div>
          ) : !bgImage ? (
            <div style={d.empty}>
              <p style={{ color: '#9ca3af' }}>
                {selFloor ? `No map for floor ${selFloor.code}.` : 'Loading map…'}
              </p>
            </div>
          ) : (
            <>
              {placingMode && (
                <div style={d.placingBanner}>
                  {placingMode === 'click'
                    ? <>Click the map to place <strong>{placingArea?.name}</strong></>
                    : <>Drag <strong>{placingArea?.name}</strong> to its new position</>
                  }
                </div>
              )}
              <Stage
                width={stageW}
                height={stageH}
                onClick={handleStageClick}
                style={{ display: 'block' }}
              >
                <Layer>
                  <KonvaImage image={bgImage} width={stageW} height={stageH} listening={false} />

                  {showBuildings && buildings
                    .filter(b => b.map_x != null && b.map_y != null)
                    .map(b => (
                      <AreaIcon
                        key={b.id}
                        area={{ ...b, map_x: b.map_x * scale, map_y: b.map_y * scale }}
                        color={selBuilding?.id === b.id ? '#1d4ed8' : '#2563eb'}
                        draggable={placingMode === 'drag' && placingArea?.id === b.id}
                        onDragEnd={(area, x, y) => handleDragEnd(area, x / scale, y / scale)}
                        onClick={area => {
                          const full = buildings.find(x => x.id === area.id);
                          setSelBuilding(full);
                          setSelFloor(null);
                          setSelRoom(null);
                          loadFloors(full.id);
                        }}
                      />
                    ))
                  }

                  {showRooms && rooms
                    .filter(r => r.map_x != null && r.map_y != null)
                    .map(r => (
                      <AreaIcon
                        key={r.id}
                        area={{ ...r, map_x: r.map_x * scale, map_y: r.map_y * scale }}
                        color={selRoom?.id === r.id ? '#15803d' : '#16a34a'}
                        draggable={placingMode === 'drag' && placingArea?.id === r.id}
                        onDragEnd={(area, x, y) => handleDragEnd(area, x / scale, y / scale)}
                        onClick={area => setSelRoom(rooms.find(x => x.id === area.id))}
                      />
                    ))
                  }
                </Layer>
              </Stage>
            </>
          )}
      </div>

      {/* ── Area detail cards ── */}
      {(selBuilding || selFloor || selRoom) && (
        <div style={d.cardsRow}>
          {[
            selBuilding && { type: 'building', area: selBuilding, canMove: true },
            selFloor    && { type: 'floor',    area: selFloor,    canMove: false },
            selRoom     && { type: 'room',      area: selRoom,     canMove: true },
          ].filter(Boolean).map(({ type, area, canMove }) => (
            <div key={type} style={d.card}>
              <div style={d.cardHead}>
                <span style={d.cardType}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {canMove && <button style={d.cardBtn} onClick={() => handleMoveIcon(type)} title="Move icon">↔</button>}
                  <button style={d.cardBtn} onClick={() => openCardEdit(type, area)} title="Edit">✎</button>
                  <button style={d.cardBtn} onClick={() => infoCard === type ? setInfoCard(null) : openCardInfo(type, area)} title="Info">ⓘ</button>
                  <button style={{ ...d.cardBtn, color: '#dc2626' }} onClick={() => handleDeleteCard(type)} title="Delete">✕</button>
                </div>
              </div>
              {editingCard === type ? (
                <form onSubmit={e => handleSaveCard(e, type)} style={{ padding: '8px 12px' }}>
                  {cardError && <p style={{ color: '#dc2626', fontSize: 11, marginBottom: 6 }}>{cardError}</p>}
                  {type !== 'floor' && (
                    <>
                      <label style={d.cardLabel}>Name</label>
                      <input style={d.cardInput} value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} required />
                    </>
                  )}
                  <label style={d.cardLabel}>Code</label>
                  <input style={d.cardInput} value={cardForm.code} onChange={e => setCardForm(f => ({ ...f, code: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={d.saveBtn} type="submit">Save</button>
                    <button style={d.cancelBtn} type="button" onClick={() => setEditingCard(null)}>Cancel</button>
                  </div>
                </form>
              ) : infoCard === type ? (
                <div style={{ padding: '6px 12px 10px' }}>
                  <p style={d.cardInfoRow}><span style={d.cardInfoKey}>ID</span><span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{area.id}</span></p>
                  <p style={d.cardInfoRow}><span style={d.cardInfoKey}>Type</span>{area.type}</p>
                  <p style={d.cardInfoRow}><span style={d.cardInfoKey}>Created</span>{new Date(area.created_at).toLocaleDateString()}</p>
                  {area.description && <p style={d.cardInfoRow}><span style={d.cardInfoKey}>Desc</span>{area.description}</p>}
                  <p style={{ ...d.cardInfoRow, marginTop: 6 }}><span style={d.cardInfoKey}>Sensors</span>{infoSensors.length === 0 ? '—' : ''}</p>
                  {infoSensors.map(s => (
                    <p key={s.id} style={{ ...d.cardMeta, paddingLeft: 8 }}>• {s.name} <span style={{ color: '#d1d5db' }}>({s.kind})</span></p>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '6px 12px 10px' }}>
                  <p style={d.cardName}>{area.name}</p>
                  {area.code && area.code !== area.name && <p style={d.cardMeta}>Code: {area.code}</p>}
                  {area.description && <p style={d.cardMeta}>{area.description}</p>}
                  <p style={d.cardMeta}>Status: {area.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}

      {modal === 'site' && (
        <Modal title="Create Site" onClose={closeModal}>
          <form onSubmit={handleCreateSite} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Site Name</label>
            <input style={m.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Campus Map Image</label>
            <input type="file" accept="image/*" style={m.fileInput} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] ?? null }))} required />
            <div style={m.actions}>
              <button style={m.btn} type="submit">Create</button>
              <button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'building' && (
        <Modal title="Create Building" onClose={closeModal}>
          <form onSubmit={handleCreateBuilding} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Name</label>
            <input style={m.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Code</label>
            <input style={m.input} placeholder="e.g. B01" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            <label style={m.label}>Description <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            <textarea style={m.textarea} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0' }}>
              After creating, click the map to place the building icon.
            </p>
            <div style={m.actions}>
              <button style={m.btn} type="submit">Create & Place</button>
              <button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'floor' && (
        <Modal title="Create Floor" onClose={closeModal}>
          <form onSubmit={handleCreateFloor} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Code</label>
            <input style={m.input} placeholder="e.g. F01" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required autoFocus />
            <label style={m.label}>Description <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            <textarea style={m.textarea} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <label style={m.label}>Floor Map Image</label>
            <input type="file" accept="image/*" style={m.fileInput} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] ?? null }))} required />
            <div style={m.actions}>
              <button style={m.btn} type="submit">Create</button>
              <button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'room' && (
        <Modal title="Create Room" onClose={closeModal}>
          <form onSubmit={handleCreateRoom} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Name</label>
            <input style={m.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Code</label>
            <input style={m.input} placeholder="e.g. R101" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            <label style={m.label}>Description <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            <textarea style={m.textarea} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0' }}>
              After creating, click the floor map to place the room icon.
            </p>
            <div style={m.actions}>
              <button style={m.btn} type="submit">Create & Place</button>
              <button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Page styles ───────────────────────────────────────────────────────────────
const d = {
  root:         { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, gap: 8 },
  select:       { padding: '5px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer' },
  siteBtn:      { padding: '5px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  mapArea:      { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  createSiteBtn:{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  placingBanner:{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#1d4ed8', color: '#fff', padding: '6px 18px', borderRadius: 20, fontSize: 13, zIndex: 10, pointerEvents: 'none' },

  // Cards row
  cardsRow:   { display: 'flex', gap: 12, padding: '10px 16px', background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0, overflowX: 'auto' },
  card:       { minWidth: 200, border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', flex: '0 0 auto' },
  cardHead:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #f3f4f6' },
  cardType:   { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280' },
  cardBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6b7280', padding: '0 3px', lineHeight: 1 },
  cardName:   { fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 2px' },
  cardMeta:   { fontSize: 11, color: '#9ca3af', margin: '0 0 2px' },
  cardLabel:    { display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2 },
  cardInput:    { display: 'block', width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 3, boxSizing: 'border-box', marginBottom: 6 },
  saveBtn:      { padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 },
  cancelBtn:    { padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 3, cursor: 'pointer', fontSize: 12 },
  cardInfoRow:  { display: 'flex', gap: 6, fontSize: 11, color: '#374151', margin: '0 0 3px', lineHeight: '1.4' },
  cardInfoKey:  { fontWeight: 600, color: '#9ca3af', minWidth: 52, flexShrink: 0 },
};

// ── Modal styles ──────────────────────────────────────────────────────────────
const m = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  box:      { background: '#fff', borderRadius: 8, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' },
  head:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f3f4f6' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 },
  form:     { padding: '18px' },
  label:    { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input:    { display: 'block', width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, boxSizing: 'border-box', marginBottom: 12 },
  fileInput:{ display: 'block', marginBottom: 16, fontSize: 13 },
  textarea: { display: 'block', width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, boxSizing: 'border-box', marginBottom: 12, resize: 'vertical', fontFamily: 'inherit' },
  actions:  { display: 'flex', gap: 8, marginTop: 8 },
  btn:      { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  btnGray:  { padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  error:    { color: '#dc2626', fontSize: 12, marginBottom: 10 },
};
