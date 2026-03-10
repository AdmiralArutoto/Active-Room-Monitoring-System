import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Rect, Text, Circle } from 'react-konva';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/shared';
import useWebSocket from '../hooks/useWebSocket';
import PageTitle from '../components/PageTitle';
import AreaTabs from '../components/AreaTabs';
import IconButton from '../components/IconButton';

import iconPlus from '../assets/icons/Vector-plus.png';
import iconMove from '../assets/icons/Vector-move.png';
import iconEdit from '../assets/icons/Vector-edit.png';
import iconTrash from '../assets/icons/Vector-trash.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SENSOR_KINDS = ['MOTION', 'LIGHT'];

// ── Icon dimensions ───────────────────────────────────────────────────────────
const ICON_W = 80;
const ICON_H = 36;
const ROOM_ICON_W = 80;
const ROOM_ICON_H = 48;
const SENSOR_DOT_R = 4;

// ── Sensor state → color mapping ─────────────────────────────────────────────
const STATE_COLORS = {
  active:       { normal: colors.sensorOn, selected: '#5a9660' },
  idle:         { normal: colors.sensorIdle, selected: '#7ba8e0' },
  fault:        { normal: '#eab308', selected: '#ca8a04' },
  unconfigured: { normal: colors.actionOff, selected: '#6b7280' },
};

function classifySensorState(stateValue) {
  if (!stateValue) return 'unconfigured';
  const v = stateValue.toLowerCase();
  if (v === 'on' || v === 'active' || v === 'detected') return 'active';
  if (v === 'off' || v === 'idle') return 'idle';
  if (v === 'fault' || v === 'error') return 'fault';
  return 'idle';
}

function getSensorDotColor(sensor, sensorStates) {
  const entry = sensorStates[sensor.sensor_key];
  if (!entry) return STATE_COLORS.unconfigured.normal;
  return STATE_COLORS[classifySensorState(entry.state)].normal;
}

function getRoomColor(room, sensors, sensorStates, isSelected) {
  const roomSensors = sensors.filter(s => s.room_area_id === room.id);
  if (roomSensors.length === 0) {
    return isSelected ? STATE_COLORS.unconfigured.selected : STATE_COLORS.unconfigured.normal;
  }
  const classifications = roomSensors.map(s => {
    const entry = sensorStates[s.sensor_key];
    return entry ? classifySensorState(entry.state) : null;
  });
  let status;
  if (classifications.some(c => c === 'fault')) status = 'fault';
  else if (classifications.some(c => c === 'active')) status = 'active';
  else if (classifications.some(c => c === 'idle')) status = 'idle';
  else status = 'unconfigured';
  return isSelected ? STATE_COLORS[status].selected : STATE_COLORS[status].normal;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={m.overlay}>
      <div style={m.box}>
        <div style={m.head}>
          <span style={{ fontWeight: 700, fontSize: 15, color: colors.textPrime }}>{title}</span>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Area icon on canvas ───────────────────────────────────────────────────────
function AreaIcon({ area, color, draggable, onDragEnd, onClick, onDblClick }) {
  return (
    <Group x={area.map_x} y={area.map_y} draggable={draggable} onDragEnd={e => onDragEnd(area, e.target.x(), e.target.y())} onClick={() => onClick(area)} onDblClick={() => onDblClick?.(area)}>
      <Rect width={ICON_W} height={ICON_H} fill={color} cornerRadius={4} shadowBlur={4} shadowOpacity={0.2} shadowOffsetY={2} />
      <Text text={area.name} width={ICON_W} height={ICON_H} align="center" verticalAlign="middle" fontSize={11} fontStyle="bold" fill="#fff" listening={false} />
    </Group>
  );
}

// ── Room icon on canvas (with sensor dots) ───────────────────────────────────
function RoomIcon({ area, color, roomSensors, sensorStates, draggable, onDragEnd, onClick }) {
  const hasDots = roomSensors.length > 0;
  const h = hasDots ? ROOM_ICON_H : ICON_H;
  const labelH = hasDots ? ICON_H - 2 : ICON_H;
  const dotY = labelH + (ROOM_ICON_H - labelH) / 2;
  const totalDotsW = roomSensors.length * (SENSOR_DOT_R * 2 + 4) - 4;
  const dotStartX = (ROOM_ICON_W - totalDotsW) / 2;

  return (
    <Group x={area.map_x} y={area.map_y} draggable={draggable} onDragEnd={e => onDragEnd(area, e.target.x(), e.target.y())} onClick={() => onClick(area)}>
      <Rect width={ROOM_ICON_W} height={h} fill={color} cornerRadius={4} shadowBlur={4} shadowOpacity={0.2} shadowOffsetY={2} />
      <Text text={area.name} width={ROOM_ICON_W} height={labelH} align="center" verticalAlign="middle" fontSize={11} fontStyle="bold" fill="#fff" listening={false} />
      {hasDots && roomSensors.map((s, i) => (
        <Circle key={s.id} x={dotStartX + i * (SENSOR_DOT_R * 2 + 4) + SENSOR_DOT_R} y={dotY} radius={SENSOR_DOT_R} fill={getSensorDotColor(s, sensorStates)} stroke="rgba(255,255,255,0.5)" strokeWidth={1} listening={false} />
      ))}
    </Group>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [site, setSite] = useState(null);
  const [siteLoaded, setSiteLoaded] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selBuilding, setSelBuilding] = useState(null);
  const [selFloor, setSelFloor] = useState(null);
  const [selRoom, setSelRoom] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [imgNatural, setImgNatural] = useState(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [placingMode, setPlacingMode] = useState(null);
  const [placingArea, setPlacingArea] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', file: null });
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({ name: '', code: '' });
  const [cardError, setCardError] = useState(null);
  const [activeTab, setActiveTab] = useState('building');
  const [infoSensors, setInfoSensors] = useState([]);
  const [sensorForm, setSensorForm] = useState({ name: '', kind: 'MOTION' });
  const [sensors, setSensors] = useState([]);
  const sensorStates = useWebSocket();

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

  useEffect(() => {
    api.get('/areas/site').then(data => {
      setSite(data); setSiteLoaded(true);
      if (data) loadBuildings(data.id);
    }).catch(() => setSiteLoaded(true));
  }, []);

  useEffect(() => { api.get('/sensors').then(setSensors).catch(() => {}); }, []);


  useEffect(() => {
    const mapArea = selFloor ?? site;
    if (!mapArea?.image_path) { setBgImage(null); setImgNatural(null); return; }
    const img = new window.Image();
    img.src = `${API_URL}/uploads/${mapArea.image_path}`;
    img.onload = () => { setBgImage(img); setImgNatural({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { setBgImage(null); setImgNatural(null); };
  }, [site, selFloor]);

  // Auto-set active tab
  useEffect(() => {
    if (selRoom) setActiveTab('room');
    else if (selFloor) setActiveTab('floor');
    else if (selBuilding) setActiveTab('building');
  }, [selBuilding, selFloor, selRoom]);

  // Load sensors for room tab
  useEffect(() => {
    if (activeTab === 'room' && selRoom) {
      api.get('/sensors').then(all => setInfoSensors(all.filter(s => s.room_area_id === selRoom.id))).catch(() => setInfoSensors([]));
    } else {
      setInfoSensors([]);
    }
  }, [activeTab, selRoom]);

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
    setSelBuilding(b); setSelFloor(null); setSelRoom(null); setRooms([]);
    await loadFloors(b.id);
  }
  async function handleSelectFloor(e) {
    const id = e.target.value;
    if (!id) { setSelFloor(null); setSelRoom(null); setRooms([]); return; }
    if (id === '__create__') { openModal('floor'); return; }
    const f = floors.find(x => x.id === id);
    setSelFloor(f); setSelRoom(null);
    await loadRooms(f.id);
  }
  function handleSelectRoom(e) {
    const id = e.target.value;
    if (!id) { setSelRoom(null); return; }
    if (id === '__create__') { openModal('room'); return; }
    setSelRoom(rooms.find(x => x.id === id));
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openModal(type) { setModal(type); setForm({ name: '', code: '', description: '', file: null }); setModalError(null); }
  function closeModal() { setModal(null); setModalError(null); setPlacingMode(null); setPlacingArea(null); }

  // ── Create handlers ──────────────────────────────────────────────────────────
  async function handleCreateSite(e) {
    e.preventDefault();
    if (!form.file) { setModalError('Map image is required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', { name: form.name.trim(), type: 'SITE' });
      const fd = new FormData(); fd.append('image', form.file);
      const updated = await api.upload(`/areas/${created.id}/image`, fd);
      setSite(updated); closeModal(); loadBuildings(updated.id);
    } catch (err) { setModalError(err.message); }
  }
  async function handleCreateBuilding(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setModalError('Name and code are required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', { name: form.name.trim(), code: form.code.trim(), type: 'BUILDING', parent_id: site.id, description: form.description.trim() || undefined });
      setModal(null); setPlacingArea(created); setPlacingMode('click');
    } catch (err) { setModalError(err.message); }
  }
  async function handleCreateFloor(e) {
    e.preventDefault();
    if (!form.code.trim()) { setModalError('Code is required'); return; }
    if (!form.file) { setModalError('Map image is required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', { name: form.code.trim(), code: form.code.trim(), type: 'FLOOR', parent_id: selBuilding.id, description: form.description.trim() || undefined });
      const fd = new FormData(); fd.append('image', form.file);
      await api.upload(`/areas/${created.id}/image`, fd);
      closeModal(); await loadFloors(selBuilding.id);
    } catch (err) { setModalError(err.message); }
  }
  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setModalError('Name and code are required'); return; }
    setModalError(null);
    try {
      const created = await api.post('/areas', { name: form.name.trim(), code: form.code.trim(), type: 'ROOM', parent_id: selFloor.id, description: form.description.trim() || undefined });
      setModal(null); setPlacingArea(created); setPlacingMode('click');
    } catch (err) { setModalError(err.message); }
  }

  // ── Canvas handlers ─────────────────────────────────────────────────────────
  async function handleStageClick(e) {
    if (placingMode !== 'click' || !placingArea) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const sc = stageScale();
    const x = pos.x / sc - ICON_W / 2;
    const y = pos.y / sc - ICON_H / 2;
    try {
      const updated = await api.patch(`/areas/${placingArea.id}/position`, { map_x: x, map_y: y });
      setPlacingMode(null);
      if (placingArea.type === 'BUILDING') { setBuildings(prev => [...prev.filter(b => b.id !== updated.id), updated]); setSelBuilding(updated); await loadFloors(updated.id); }
      else if (placingArea.type === 'ROOM') { setRooms(prev => [...prev.filter(r => r.id !== updated.id), updated]); setSelRoom(updated); }
      setPlacingArea(null);
    } catch (err) { console.error(err); }
  }
  async function handleDragEnd(area, x, y) {
    try {
      const updated = await api.patch(`/areas/${area.id}/position`, { map_x: x, map_y: y });
      if (area.type === 'BUILDING') setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b));
      if (area.type === 'ROOM') setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
      setPlacingMode(null); setPlacingArea(null);
    } catch (err) { console.error(err); }
  }

  // ── Card edit/delete ─────────────────────────────────────────────────────────
  function openCardEdit(type, area) { setEditingCard(type); setCardForm({ name: area.name ?? '', code: area.code ?? '' }); setCardError(null); }
  async function handleSaveCard(e, type) {
    e.preventDefault(); setCardError(null);
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
      else if (type === 'floor') { setSelFloor(null); setSelRoom(null); setRooms([]); setFloors(prev => prev.filter(f => f.id !== target.id)); }
      else { setSelBuilding(null); setSelFloor(null); setSelRoom(null); setFloors([]); setRooms([]); setBuildings(prev => prev.filter(b => b.id !== target.id)); }
    } catch (err) { alert(err.message); }
  }
  function handleMoveIcon(type) { setPlacingArea(type === 'building' ? selBuilding : selRoom); setPlacingMode('drag'); }

  // ── Sensor creation ─────────────────────────────────────────────────────────
  function openSensorModal() { setSensorForm({ name: '', kind: 'MOTION' }); setModal('sensor'); setModalError(null); }
  async function handleCreateSensor(e) {
    e.preventDefault();
    if (!sensorForm.name.trim()) { setModalError('Name is required'); return; }
    setModalError(null);
    try {
      await api.post('/sensors', { name: sensorForm.name.trim(), kind: sensorForm.kind, room_area_id: selRoom.id });
      closeModal();
      api.get('/sensors').then(all => { setSensors(all); setInfoSensors(all.filter(s => s.room_area_id === selRoom.id)); }).catch(() => {});
    } catch (err) { setModalError(err.message); }
  }

  // ── Canvas scale helpers ──────────────────────────────────────────────────────
  function stageScale() {
    if (!imgNatural) return 1;
    return Math.min(containerSize.w / imgNatural.w, containerSize.h / imgNatural.h, 1);
  }
  const scale = stageScale();
  const stageW = imgNatural ? imgNatural.w * scale : containerSize.w;
  const stageH = imgNatural ? imgNatural.h * scale : containerSize.h;
  const showBuildings = !selFloor;
  const showRooms = !!selFloor;
  const tabArea = activeTab === 'building' ? selBuilding : activeTab === 'floor' ? selFloor : selRoom;
  const canMove = activeTab === 'building' || activeTab === 'room';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={d.root}>
      <div style={d.container}>
      <PageTitle style={d.pageTitle}>Dashboard</PageTitle>

      <div style={d.controlRow}>
        <button style={d.siteBtn} onClick={() => { setSelBuilding(null); setSelFloor(null); setSelRoom(null); setFloors([]); setRooms([]); }}>
          {site?.name ?? 'Site Name'}
        </button>
        {site && (
          <div style={d.dropdowns}>
            <select style={d.select} value={selBuilding?.id ?? ''} onChange={handleSelectBuilding}>
              <option value="">Building</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              {isAdmin && <option value="__create__">+ Add Building</option>}
            </select>
            <select style={d.select} value={selFloor?.id ?? ''} onChange={handleSelectFloor} disabled={!selBuilding}>
              <option value="">Floor</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}
              {isAdmin && selBuilding && <option value="__create__">+ Add Floor</option>}
            </select>
            <select style={d.select} value={selRoom?.id ?? ''} onChange={handleSelectRoom} disabled={!selFloor}>
              <option value="">Room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              {isAdmin && selFloor && <option value="__create__">+ Add Room</option>}
            </select>
          </div>
        )}
      </div>

      {/* Map card */}
      <div
        ref={containerRef}
        className="dashboard-map-card"
        style={{ ...d.mapCard, cursor: placingMode === 'click' ? 'crosshair' : 'default' }}
      >
        {!siteLoaded ? null
          : !site ? (
            <div style={d.empty}>
              {isAdmin
                ? <span style={d.addSiteText} onClick={() => openModal('site')}>+ Click To Add Site</span>
                : <p style={{ color: colors.textSecondary }}>No site configured.</p>}
            </div>
          ) : !bgImage ? (
            <div style={d.empty}><p style={{ color: colors.textSecondary }}>{selFloor ? `No map for floor ${selFloor.code}.` : 'Loading map…'}</p></div>
          ) : (
            <>
              {placingMode && (
                <div style={d.placingBanner}>
                  {placingMode === 'click' ? <>Click the map to place <strong>{placingArea?.name}</strong></> : <>Drag <strong>{placingArea?.name}</strong> to its new position</>}
                </div>
              )}
              <Stage width={stageW} height={stageH} onClick={handleStageClick} style={{ display: 'block' }}>
                <Layer>
                  <KonvaImage image={bgImage} width={stageW} height={stageH} listening={false} />
                  {showBuildings && buildings.filter(b => b.map_x != null && b.map_y != null).map(b => (
                    <AreaIcon key={b.id} area={{ ...b, map_x: b.map_x * scale, map_y: b.map_y * scale }} color={selBuilding?.id === b.id ? '#1d4ed8' : colors.action}
                      draggable={placingMode === 'drag' && placingArea?.id === b.id} onDragEnd={(area, x, y) => handleDragEnd(area, x / scale, y / scale)}
                      onClick={area => { const full = buildings.find(x => x.id === area.id); setSelBuilding(full); setSelFloor(null); setSelRoom(null); setRooms([]); loadFloors(full.id); }}
                      onDblClick={async area => {
                        const full = buildings.find(x => x.id === area.id); setSelBuilding(full); setSelFloor(null); setSelRoom(null);
                        const floorData = await api.get(`/areas/${full.id}/children`); const floorList = floorData.filter(a => a.type === 'FLOOR');
                        setFloors(floorList); setRooms([]);
                        if (floorList.length > 0) { setSelFloor(floorList[0]); await loadRooms(floorList[0].id); }
                      }}
                    />
                  ))}
                  {showRooms && rooms.filter(r => r.map_x != null && r.map_y != null).map(r => (
                    <RoomIcon key={r.id} area={{ ...r, map_x: r.map_x * scale, map_y: r.map_y * scale }}
                      color={getRoomColor(r, sensors, sensorStates, selRoom?.id === r.id)}
                      roomSensors={sensors.filter(s => s.room_area_id === r.id)} sensorStates={sensorStates}
                      draggable={placingMode === 'drag' && placingArea?.id === r.id} onDragEnd={(area, x, y) => handleDragEnd(area, x / scale, y / scale)}
                      onClick={area => setSelRoom(rooms.find(x => x.id === area.id))}
                    />
                  ))}
                </Layer>
              </Stage>
            </>
          )}
      </div>

      {/* Info panel with tabs */}
      {(selBuilding || selFloor || selRoom) && (
        <div style={d.infoPanel} className="dashboard-info-card">
          <div style={d.tabBar} className="tabs-bar">
            <AreaTabs
              activeTab={activeTab.toUpperCase()}
              onChange={(tab) => setActiveTab(tab.toLowerCase())}
              enabledTabs={[
                ...(selBuilding ? ['BUILDING'] : []),
                ...(selFloor ? ['FLOOR'] : []),
                ...(selRoom ? ['ROOM'] : []),
              ]}
            />
            {tabArea && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="tabs-actions">
                {isAdmin && activeTab === 'room' && (
                  <IconButton
                    label="Add sensor"
                    title="Add sensor"
                    onClick={openSensorModal}
                    icon={<img src={iconPlus} alt="" style={{ width: 14, height: 14 }} />}
                  />
                )}
                {isAdmin && canMove && (
                  <IconButton
                    label="Move icon"
                    title="Move icon"
                    onClick={() => handleMoveIcon(activeTab)}
                    icon={<img src={iconMove} alt="" style={{ width: 14, height: 14 }} />}
                  />
                )}
                {isAdmin && (
                  <IconButton
                    label="Edit"
                    title="Edit"
                    onClick={() => openCardEdit(activeTab, tabArea)}
                    icon={<img src={iconEdit} alt="" style={{ width: 14, height: 14 }} />}
                  />
                )}
                {isAdmin && (
                  <IconButton
                    label="Delete"
                    title="Delete"
                    danger
                    onClick={() => handleDeleteCard(activeTab)}
                    icon={<img src={iconTrash} alt="" style={{ width: 14, height: 14 }} />}
                  />
                )}
              </div>
            )}
          </div>
          {tabArea && (
            editingCard === activeTab ? (
              <form onSubmit={e => handleSaveCard(e, activeTab)} style={d.tabContent}>
                {cardError && <p style={{ color: colors.remove, fontSize: 12, marginBottom: 6 }}>{cardError}</p>}
                {activeTab !== 'floor' && (<><label style={d.fieldLabel}>Name</label><input style={d.fieldInput} value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} required /></>)}
                <label style={d.fieldLabel}>Code</label>
                <input style={d.fieldInput} value={cardForm.code} onChange={e => setCardForm(f => ({ ...f, code: e.target.value }))} />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button style={d.saveBtn} type="submit">Save</button>
                  <button style={d.cancelBtn} type="button" onClick={() => setEditingCard(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={d.tabContent}>
                <div style={d.tabColumns}>
                  <div style={d.tabLeft}>
                    <div style={d.fieldRow}><span style={d.fieldKey}>Name</span><span style={d.fieldVal}>{tabArea.name}</span></div>
                    {tabArea.code && tabArea.code !== tabArea.name && <div style={d.fieldRow}><span style={d.fieldKey}>Code</span><span style={d.fieldVal}>{tabArea.code}</span></div>}
                    <div style={d.fieldRow}><span style={d.fieldKey}>Created</span><span style={d.fieldVal}>{new Date(tabArea.created_at).toLocaleDateString()} - {new Date(tabArea.created_at).toLocaleTimeString()}</span></div>
                    <div style={d.fieldRow}><span style={d.fieldKey}>Active</span><span style={d.fieldVal}>{tabArea.is_active ? 'Yes' : 'No'}</span></div>
                  </div>
                  {activeTab === 'room' && (
                    <div style={d.tabRight}>
                      <span style={d.fieldKey}>Sensors</span>
                      {infoSensors.length === 0
                        ? <span style={{ color: colors.textSecondary, fontSize: 13 }}>—</span>
                        : infoSensors.map(s => {
                            const stateEntry = sensorStates[s.sensor_key];
                            const cls = classifySensorState(stateEntry?.state);
                            const dotColor = cls === 'active' ? colors.sensorOn : cls === 'idle' ? colors.sensorIdle : colors.actionOff;
                            return (<div key={s.id} style={d.sensorRow}><span style={{ ...d.sensorDot, background: dotColor }} /><span style={{ fontSize: 13, color: colors.textPrime }}>{s.sensor_key}</span></div>);
                          })}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      </div>{/* end container */}

      {/* Modals */}
      {modal === 'site' && (
        <Modal title="Create Site" onClose={closeModal}>
          <form onSubmit={handleCreateSite} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Site Name</label>
            <input style={m.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Campus Map Image</label>
            <input type="file" accept="image/*" style={m.fileInput} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] ?? null }))} required />
            <div style={m.actions}><button style={m.btn} type="submit">Create</button><button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button></div>
          </form>
        </Modal>
      )}
      {modal === 'building' && (
        <Modal title="Create Building" onClose={closeModal}>
          <form onSubmit={handleCreateBuilding} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Name</label><input style={m.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Code</label><input style={m.input} placeholder="e.g. B01" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            <label style={m.label}>Description <span style={{ fontWeight: 400, color: colors.textSecondary }}>(optional)</span></label>
            <textarea style={m.textarea} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p style={{ fontSize: 12, color: colors.textSecondary, margin: '8px 0 0' }}>After creating, click the map to place the building icon.</p>
            <div style={m.actions}><button style={m.btn} type="submit">Create & Place</button><button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button></div>
          </form>
        </Modal>
      )}
      {modal === 'floor' && (
        <Modal title="Create Floor" onClose={closeModal}>
          <form onSubmit={handleCreateFloor} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Code</label><input style={m.input} placeholder="e.g. F01" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required autoFocus />
            <label style={m.label}>Description <span style={{ fontWeight: 400, color: colors.textSecondary }}>(optional)</span></label>
            <textarea style={m.textarea} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <label style={m.label}>Floor Map Image</label>
            <input type="file" accept="image/*" style={m.fileInput} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] ?? null }))} required />
            <div style={m.actions}><button style={m.btn} type="submit">Create</button><button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button></div>
          </form>
        </Modal>
      )}
      {modal === 'room' && (
        <Modal title="Create Room" onClose={closeModal}>
          <form onSubmit={handleCreateRoom} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Name</label><input style={m.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Code</label><input style={m.input} placeholder="e.g. R101" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            <label style={m.label}>Description <span style={{ fontWeight: 400, color: colors.textSecondary }}>(optional)</span></label>
            <textarea style={m.textarea} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p style={{ fontSize: 12, color: colors.textSecondary, margin: '8px 0 0' }}>After creating, click the floor map to place the room icon.</p>
            <div style={m.actions}><button style={m.btn} type="submit">Create & Place</button><button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button></div>
          </form>
        </Modal>
      )}
      {modal === 'sensor' && selRoom && (
        <Modal title={`Add Sensor — ${selRoom.name}`} onClose={closeModal}>
          <form onSubmit={handleCreateSensor} style={m.form}>
            {modalError && <p style={m.error}>{modalError}</p>}
            <label style={m.label}>Name</label><input style={m.input} value={sensorForm.name} onChange={e => setSensorForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            <label style={m.label}>Kind</label>
            <select style={m.input} value={sensorForm.kind} onChange={e => setSensorForm(f => ({ ...f, kind: e.target.value }))}>{SENSOR_KINDS.map(k => <option key={k}>{k}</option>)}</select>
            <div style={m.actions}><button style={m.btn} type="submit">Add Sensor</button><button style={m.btnGray} type="button" onClick={closeModal}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Page styles ───────────────────────────────────────────────────────────────
const d = {
  root:         { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' },
  container:    { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1240, margin: '0 auto', paddingBottom: 20 },
  pageTitle:    { marginBottom: 8, fontSize: 40, lineHeight: 1.1 },
  controlRow:   { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 0 10px', flexShrink: 0, gap: 12, flexWrap: 'wrap' },
  siteBtn:      { background: 'none', border: 'none', cursor: 'pointer', fontSize: 36, fontWeight: 700, color: colors.textPrime, padding: 0, lineHeight: 1 },
  dropdowns:    { display: 'flex', gap: 10, flexWrap: 'wrap' },
  select:       { height: 36, padding: '0 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.white, cursor: 'pointer', color: colors.textPrime, minWidth: 150 },
  mapCard:      { width: '100%', cursor: 'default' },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  addSiteText:  { fontSize: 36, color: colors.textPrime, cursor: 'pointer', fontWeight: 700 },
  placingBanner:{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: colors.action, color: '#fff', padding: '6px 18px', borderRadius: 20, fontSize: 13, zIndex: 10, pointerEvents: 'none' },
  infoPanel:    { marginTop: 10, flexShrink: 0 },
  tabBar:       { minHeight: 42 },
  tabContent:   { padding: '12px 14px' },
  tabColumns:   { display: 'grid', gridTemplateColumns: '1.1fr 1fr', minHeight: 130 },
  tabLeft:      { paddingRight: 18, borderRight: `1px solid ${colors.border}` },
  tabRight:     { paddingLeft: 18 },
  fieldRow:     { display: 'flex', gap: 12, marginBottom: 8, fontSize: 14 },
  fieldKey:     { fontWeight: 700, color: '#585858', minWidth: 70 },
  fieldVal:     { color: colors.textPrime, wordBreak: 'break-word' },
  sensorRow:    { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 },
  sensorDot:    { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  fieldLabel:   { display: 'block', fontSize: 13, fontWeight: 700, color: colors.textPrime, marginBottom: 4 },
  fieldInput:   { display: 'block', width: '100%', height: 34, padding: '0 10px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 8, boxSizing: 'border-box', marginBottom: 8 },
  saveBtn:      { height: 34, padding: '0 14px', background: colors.action, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  cancelBtn:    { height: 34, padding: '0 14px', background: colors.white, color: colors.textPrime, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
};

const m = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  box:      { background: colors.white, borderRadius: 12, width: 400, boxShadow: '0 10px 28px rgba(0,0,0,0.18)', overflow: 'hidden', border: `1px solid ${colors.border}` },
  head:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${colors.border}` },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: colors.textSecondary, lineHeight: 1 },
  form:     { padding: '14px 16px 16px' },
  label:    { display: 'block', fontSize: 13, fontWeight: 700, color: colors.textPrime, marginBottom: 4 },
  input:    { display: 'block', width: '100%', height: 36, padding: '0 10px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 8, boxSizing: 'border-box', marginBottom: 12, background: colors.white },
  fileInput:{ display: 'block', marginBottom: 16, fontSize: 13 },
  textarea: { display: 'block', width: '100%', padding: '8px 10px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 8, boxSizing: 'border-box', marginBottom: 12, resize: 'vertical', fontFamily: 'inherit' },
  actions:  { display: 'flex', gap: 8, marginTop: 8 },
  btn:      { height: 36, padding: '0 14px', background: colors.action, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnGray:  { height: 36, padding: '0 14px', background: colors.white, color: colors.textPrime, border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  error:    { color: colors.remove, fontSize: 13, marginBottom: 10 },
};
