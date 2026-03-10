import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/home', label: 'Home', icon: '⌂' },
  { path: '/dashboard', label: 'Dashboard', icon: '▦' },
  { path: '/areas', label: 'Areas', icon: '▥' },
  { path: '/sensors', label: 'Sensors', icon: '◉' },
  { path: '/logs', label: 'Logs', icon: '▤' },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>
        <div className={`app-brand ${collapsed ? 'app-brand--collapsed' : ''}`}>{collapsed ? 'A' : 'ARDS'}</div>

        <nav className="app-nav">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`app-nav-item ${active ? 'active' : ''} ${collapsed ? 'app-nav-item--collapsed' : ''}`.trim()}
                onClick={() => navigate(item.path)}
                title={item.label}
              >
                <span className="app-nav-icon">{item.icon}</span>
                {!collapsed && <span className="app-nav-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <button
            type="button"
            className="icon-button"
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((v) => !v)}
          >
            ☰
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="button button-ghost" style={{ cursor: 'default' }}>
              {user?.username ?? 'User'}
            </button>
            <button type="button" className="button button-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="app-main">
          <div className="page-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
