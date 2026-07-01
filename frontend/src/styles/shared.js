export const colors = {
  pageBg:       '#EEF1F4',
  white:        '#FFFFFF',
  compBg:       '#F5F6F8',
  textPrime:    '#1E2A4A',
  textSecondary:'#5A6573',
  textMuted:    '#8A93A0',
  action:       '#2D8FB3',
  actionHover:  '#267A99',
  actionOff:    '#9AA3AF',
  dropdownAdd:  '#E8F4F8',
  remove:       '#D14343',
  sensorOn:     '#2E7D32',
  sensorIdle:   '#9EBEF1',
  border:       '#E3E7EC',
  borderStrong: '#D4D9E0',
  sidebarBg:    '#1E2A4A',
  toggleOn:     '#2D8FB3',
  toggleOff:    '#C4CCD6',
};

export const container = {
  base:      { width: '100%', maxWidth: 960, margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' },
  wide:      { width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' },
};

export const sh = {
  layout:      { display: 'flex', flex: 1, minHeight: 0, fontFamily: "'Inter', system-ui, sans-serif" },
  sidebar:     { width: 280, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', background: colors.compBg, flexShrink: 0, overflowY: 'auto' },
  sidebarHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 },
  detail:      { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },

  form:        { padding: 24, maxWidth: 480 },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: colors.textPrime },
  input:       { display: 'block', width: '100%', marginBottom: 14, padding: '7px 10px', fontSize: 14, boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.white },

  btn:         { padding: '8px 16px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  btnSm:       { padding: '5px 12px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  btnGray:     { padding: '8px 16px', background: colors.actionOff, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  btnSmGray:   { padding: '5px 12px', background: colors.actionOff, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  btnRed:      { padding: '8px 16px', background: colors.remove, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },

  error:       { color: colors.remove, fontSize: 13, marginBottom: 10 },
  meta:        { fontSize: 14, margin: '4px 0', color: colors.textPrime },
  muted:       { color: colors.textSecondary, fontSize: 13 },
};
