import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, container } from '../styles/shared';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={s.root}>
      <div style={s.card}>
        <h1 style={s.title}>Welcome back, {user?.username}.</h1>
        <p style={s.sub}>ARDS — Area & Room Dashboard System</p>
        <div style={s.links}>
          <button style={s.btn} onClick={() => navigate('/dashboard')}>Open Dashboard</button>
          <button style={s.btnGhost} onClick={() => navigate('/areas')}>Manage Areas</button>
          <button style={s.btnGhost} onClick={() => navigate('/sensors')}>Manage Sensors</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root:    { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: colors.pageBg },
  card:    { ...container.base, maxWidth: 480 },
  title:   { fontSize: 26, fontWeight: 700, color: colors.textPrime, marginBottom: 6 },
  sub:     { fontSize: 14, color: colors.textSecondary, marginBottom: 32 },
  links:   { display: 'flex', gap: 12, flexWrap: 'wrap' },
  btn:     { padding: '10px 20px', background: colors.action, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  btnGhost:{ padding: '10px 20px', background: colors.white, color: colors.textPrime, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 14 },
};
