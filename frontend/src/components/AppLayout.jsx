import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useWebSocket from '../hooks/useWebSocket';
import { DashboardIcon, AnalyticsIcon, SensorsIcon, LogsIcon, UsersIcon, SettingsIcon, LogoutIcon } from './NavIcons';
import logoSvg from '../assets/logo-waveform.svg';

const WS_LABEL = { open: 'Live', connecting: 'Connecting…', closed: 'Reconnecting…' };

const ROLE_LEVEL = { VIEWER: 0, MANAGER: 1, ADMIN: 2 };

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { path: '/analytics', label: 'Analytics', Icon: AnalyticsIcon, minRole: 'MANAGER' },
  { path: '/sensors',   label: 'Sensors',   Icon: SensorsIcon,   minRole: 'MANAGER' },
  { path: '/logs',      label: 'Logs',      Icon: LogsIcon,      minRole: 'MANAGER' },
  { path: '/manage',    label: 'Users',      Icon: UsersIcon,     minRole: 'ADMIN' },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const menuRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Connection indicator for the live feed (own lightweight socket, status only).
  useWebSocket(null, setWsStatus);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const userLevel = ROLE_LEVEL[user?.role] ?? 0;
  const navItems = NAV_ITEMS.filter(item => !item.minRole || userLevel >= ROLE_LEVEL[item.minRole]);
  const displayName = user?.full_name || user?.username || 'User';

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>
        <div className={`app-brand ${collapsed ? 'app-brand--collapsed' : ''}`}>
          <img src={logoSvg} alt="" className="app-brand-logo" />
          <span className="app-brand-text">
            <span className="hall">Hall</span>
            <span className="sense">Sense</span>
          </span>
        </div>

        <nav className="app-nav">
          {navItems.map(({ path, label, Icon }) => {
            const active = location.pathname === path;
            const iconColor = active ? '#5fc8f0' : 'rgba(255,255,255,0.6)';
            return (
              <button
                key={path}
                type="button"
                className={`app-nav-item ${active ? 'active' : ''} ${collapsed ? 'app-nav-item--collapsed' : ''}`.trim()}
                onClick={() => navigate(path)}
                title={label}
              >
                <span className="app-nav-icon"><Icon color={iconColor} /></span>
                {!collapsed && <span className="app-nav-label">{label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <button type="button" className="topbar-menu-btn" aria-label="Toggle sidebar" onClick={() => setCollapsed(v => !v)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a6573" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7H20" /><path d="M4 12H20" /><path d="M4 17H20" />
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className={`ws-badge ws-badge--${wsStatus === 'open' ? 'open' : 'closed'}`} title="Live data connection">
            <span className="ws-badge-dot" />
            {WS_LABEL[wsStatus] ?? 'Offline'}
          </div>

          <div className="user-menu-wrap" ref={menuRef}>
            <button type="button" className="user-menu-trigger" onClick={() => setMenuOpen(v => !v)}>
              <span>{displayName}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5a6573" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={menuOpen ? 'M6 15L12 9L18 15' : 'M6 9L12 15L18 9'} />
              </svg>
            </button>

            {menuOpen && (
              <div className="user-menu-dropdown">
                <button type="button" className="user-menu-item" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                  <SettingsIcon color="#5a6573" />
                  <span>Settings</span>
                </button>
                <button type="button" className="user-menu-item user-menu-item--danger" onClick={handleLogout}>
                  <LogoutIcon color="#d14343" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="app-main">
          <div className="page-content">{children}</div>
        </main>

        <footer className="app-footer">
          <span>&copy; 2026 HallSense &middot; Real-time campus monitoring</span>
          <div className="app-footer-links">
            <a
              href="https://github.com/AdmiralArutoto/Active-Room-Monitoring-System/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
            <span className="app-footer-version">v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
