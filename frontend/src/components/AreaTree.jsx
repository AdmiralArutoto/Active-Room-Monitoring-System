import { useState } from 'react';
import { api } from '../api/client';

export default function AreaTree({ area, onSelect, selectedId }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!expanded && children === null) {
      setLoading(true);
      try {
        const data = await api.get(`/areas/${area.id}/children`);
        setChildren(data);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(prev => !prev);
  }

  const isSelected = selectedId === area.id;
  const indent = { BUILDING: 0, FLOOR: 16, ROOM: 32 }[area.type] ?? 0;

  return (
    <div>
      <div
        style={{
          ...styles.node,
          marginLeft: indent,
          background: isSelected ? '#dbeafe' : 'transparent',
          opacity: area.is_active ? 1 : 0.45,
        }}
      >
        <button style={styles.toggle} onClick={toggle}>
          {loading ? '…' : expanded ? '▾' : '▸'}
        </button>
        <span
          style={styles.label}
          onClick={() => onSelect(area)}
        >
          <span style={styles.badge(area.type)}>{area.type[0]}</span>
          {area.name}
        </span>
      </div>

      {expanded && children && children.map(child => (
        <AreaTree key={child.id} area={child} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

const styles = {
  node:   { display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4, cursor: 'default' },
  toggle: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginRight: 4, color: '#555' },
  label:  { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, userSelect: 'none' },
  badge:  (type) => ({
    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, color: '#fff',
    background: type === 'BUILDING' ? '#1d4ed8' : type === 'FLOOR' ? '#0891b2' : '#059669',
  }),
};
