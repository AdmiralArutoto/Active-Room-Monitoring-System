import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/shared';

const NAV_ITEMS = [
  { path: '/home',      label: 'Home',      icon: '⌂' },
  { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { path: '/areas',     label: 'Areas',     icon: '⬡' },
  { path: '/sensors',   label: 'Sensors',   icon: '◉' },
  { path: '/logs',      label: 'Logs',      icon: '▤' },
];

export default function AppLayout({ children }) {
  const [navOpen, setNavOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={s.root}>
      {/* ── Header bar ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.brand}>ARDS</span>
          <button style={s.hamburger} onClick={() => setNavOpen(o => !o)}>
            <span style={s.hamburgerIcon}>☰</span>
          </button>
        </div>
        <div style={s.headerRight}>
          <span style={s.username}>{user?.username}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={s.body}>
        {/* ── Side nav ── */}
        <nav style={{ ...s.nav, width: navOpen ? 200 : 0, padding: navOpen ? '12px 0' : 0 }}>
          {navOpen && NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  ...s.navItem,
                  borderLeft: active ? `3px solid ${colors.action}` : '3px solid transparent',
                  color: active ? colors.textPrime : colors.textSecondary,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span style={s.navLabel}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* ── Page content ── */}
        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}

const s = {
  root:         { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: colors.pageBg },

  // Header
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, padding: '0 20px', background: colors.white, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 },
  headerLeft:   { display: 'flex', alignItems: 'center', gap: 16 },
  brand:        { fontSize: 15, fontWeight: 800, color: colors.textPrime, letterSpacing: '0.02em' },
  hamburger:    { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', lineHeight: 1 },
  hamburgerIcon:{ fontSize: 18, color: colors.textSecondary },
  headerRight:  { display: 'flex', alignItems: 'center', gap: 12 },
  username:     { fontSize: 13, color: colors.textSecondary },
  logoutBtn:    { padding: '4px 12px', background: colors.compBg, color: colors.textPrime, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 },

  // Body (nav + content)
  body:         { display: 'flex', flex: 1, minHeight: 0 },

  // Side nav
  nav:          { background: colors.white, borderRight: `1px solid ${colors.border}`, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.15s, padding 0.15s' },
  navItem:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 14 },
  navIcon:      { fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' },
  navLabel:     { whiteSpace: 'nowrap' },

  // Content
  content:      { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' },
};
