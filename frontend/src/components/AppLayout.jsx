import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/home',      label: 'Home',      icon: '⌂' },
  { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { path: '/areas',     label: 'Areas',     icon: '⬡' },
  { path: '/sensors',   label: 'Sensors',   icon: '◉' },
  { path: '/logs',      label: 'Logs',      icon: '≡', disabled: true },
];

const PATH_CRUMBS = {
  '/home':      ['Home'],
  '/dashboard': ['Home', 'Dashboard'],
  '/areas':     ['Home', 'Areas'],
  '/sensors':   ['Home', 'Sensors'],
  '/logs':      ['Home', 'Logs'],
};

export default function AppLayout({ children }) {
  const [navOpen, setNavOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const crumbs = PATH_CRUMBS[location.pathname] ?? ['Home'];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={s.root}>
      {/* Collapsible left nav */}
      <div style={{ ...s.nav, width: navOpen ? 200 : 48 }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          return (
            <div
              key={item.path}
              onClick={() => !item.disabled && navigate(item.path)}
              title={!navOpen ? item.label : undefined}
              style={{
                ...s.navItem,
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                opacity: item.disabled ? 0.35 : 1,
                cursor: item.disabled ? 'default' : 'pointer',
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {navOpen && <span style={s.navLabel}>{item.label}</span>}
            </div>
          );
        })}
      </div>

      {/* Right: top bar + content */}
      <div style={s.right}>
        <div style={s.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={s.hamburger} onClick={() => setNavOpen(o => !o)}>☰</button>
            <div style={s.crumb}>
              {crumbs.map((label, i) => (
                <span key={i}>
                  {i > 0 && <span style={s.crumbSep}>/</span>}
                  <span style={i === crumbs.length - 1 ? s.crumbCurrent : s.crumbPrev}>{label}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={s.username}>{user?.username}</span>
            <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}

const s = {
  root:         { display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' },
  nav:          { background: '#111827', display: 'flex', flexDirection: 'column', paddingTop: 8, flexShrink: 0, overflow: 'hidden', transition: 'width 0.15s' },
  navItem:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 6, margin: '2px 6px', color: '#e5e7eb' },
  navIcon:      { fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' },
  navLabel:     { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' },
  right:        { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 48, borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 },
  hamburger:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 6px', color: '#374151', lineHeight: 1 },
  crumb:        { fontSize: 13 },
  crumbSep:     { margin: '0 6px', color: '#d1d5db' },
  crumbPrev:    { color: '#9ca3af' },
  crumbCurrent: { color: '#111827', fontWeight: 600 },
  username:     { fontSize: 13, color: '#6b7280' },
  logoutBtn:    { padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  content:      { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' },
};
