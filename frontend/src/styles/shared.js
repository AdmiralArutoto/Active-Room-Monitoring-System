// ── Figma design tokens ──────────────────────────────────────────────────────
export const colors = {
  pageBg:       '#EEEEEE',
  white:        '#FFFFFF',
  compBg:       '#F5F5F5',  // component background (cards, table headers)
  textPrime:    '#121619',
  textSecondary:'#828282',
  action:       '#3F81EA',  // buttons, toggles active
  actionOff:    '#878D96',  // toggle off, disabled
  dropdownAdd:  '#ECF2FF',  // "+ Add" option bg in dropdowns
  remove:       '#EF5350',  // trash / destructive
  sensorOn:     '#6BA76E',
  sensorIdle:   '#9EBEF1',
  border:       '#E0E0E0',
};

// Page container (centered with max-width)
export const container = {
  base:      { width: '100%', maxWidth: 960, margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' },
  wide:      { width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' },
};

// Reusable style fragments
export const sh = {
  // Two-column page shell
  layout:      { display: 'flex', flex: 1, minHeight: 0, fontFamily: 'system-ui, sans-serif' },
  sidebar:     { width: 280, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', background: colors.compBg, flexShrink: 0, overflowY: 'auto' },
  sidebarHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 },
  detail:      { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },

  // Forms
  form:        { padding: 24, maxWidth: 480 },
  label:       { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: colors.textPrime },
  input:       { display: 'block', width: '100%', marginBottom: 14, padding: '7px 10px', fontSize: 14, boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.white },

  // Buttons
  btn:         { padding: '8px 16px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  btnSm:       { padding: '5px 12px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  btnGray:     { padding: '8px 16px', background: colors.actionOff, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  btnSmGray:   { padding: '5px 12px', background: colors.actionOff, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  btnRed:      { padding: '8px 16px', background: colors.remove, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },

  // Text
  error:       { color: colors.remove, fontSize: 13, marginBottom: 10 },
  meta:        { fontSize: 14, margin: '4px 0', color: colors.textPrime },
  muted:       { color: colors.textSecondary, fontSize: 13 },
};
