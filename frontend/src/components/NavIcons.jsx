const s = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function DashboardIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <path d="M4 4H20V20H4Z" /><path d="M11 4V20" /><path d="M11 12H20" />
    </svg>
  );
}

export function AnalyticsIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <path d="M4 4V20H20" /><path d="M8 16V12" /><path d="M12 16V7" /><path d="M16 16V10" />
    </svg>
  );
}

export function SensorsIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <path d="M6.5 8.5A7 7 0 0 0 6.5 15.5" /><path d="M3.8 6A11 11 0 0 0 3.8 18" />
      <path d="M17.5 8.5A7 7 0 0 1 17.5 15.5" /><path d="M20.2 6A11 11 0 0 1 20.2 18" />
      <path d="M12 12h.01" />
    </svg>
  );
}

export function LogsIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <path d="M4 5H20V19H4Z" /><path d="M4 9H20" /><path d="M7 13H13" />
    </svg>
  );
}

export function UsersIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <path d="M9 11A3 3 0 1 0 9 5A3 3 0 0 0 9 11" />
      <path d="M3.5 19C3.5 15 6 13 9 13C12 13 14.5 15 14.5 19" />
      <path d="M16.5 10.5A2.6 2.6 0 1 0 16.5 5.3" />
      <path d="M16.8 13C19.2 13.2 20.8 15 20.8 18" />
    </svg>
  );
}

export function SettingsIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19 12A7 7 0 0 0 18.9 10.8L20.5 9.6L19 7L17.1 7.8A7 7 0 0 0 15 6.6L14.7 4.6H11.3L11 6.6A7 7 0 0 0 8.9 7.8L7 7L5.5 9.6L7.1 10.8A7 7 0 0 0 7.1 13.2L5.5 14.4L7 17L8.9 16.2A7 7 0 0 0 11 17.4L11.3 19.4H14.7L15 17.4A7 7 0 0 0 17.1 16.2L19 17L20.5 14.4L18.9 13.2A7 7 0 0 0 19 12Z" />
    </svg>
  );
}

export function LogoutIcon({ color }) {
  return (
    <svg {...s} stroke={color}>
      <path d="M14 4H6V20H14" /><path d="M10 12H21" /><path d="M17 8L21 12L17 16" />
    </svg>
  );
}
