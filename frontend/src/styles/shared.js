// Shared style tokens reused across all pages.
// Page-specific styles (e.g. kindBadge, canvas) stay in their respective files.

export const sh = {
  // Two-column page shell (used by AreasPage, SensorsPage, etc.)
  layout:      { display: 'flex', flex: 1, minHeight: 0, fontFamily: 'system-ui, sans-serif' },
  sidebar:     { width: 280, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#f9fafb', flexShrink: 0, overflowY: 'auto' },
  sidebarHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 },
  detail:      { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },

  // Forms
  form:        { padding: 24, maxWidth: 480 },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 },
  input:       { display: 'block', width: '100%', marginBottom: 14, padding: '7px 10px', fontSize: 14, boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 4 },

  // Buttons
  btn:         { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  btnSm:       { padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnGray:     { padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  btnSmGray:   { padding: '4px 10px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnRed:      { padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },

  // Text
  error:       { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  meta:        { fontSize: 14, margin: '4px 0' },
  muted:       { color: '#9ca3af', fontSize: 13 },
};
