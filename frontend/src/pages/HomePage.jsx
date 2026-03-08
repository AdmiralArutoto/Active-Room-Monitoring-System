import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  root:    { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32 },
  card:    { maxWidth: 480, width: '100%' },
  title:   { fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 6 },
  sub:     { fontSize: 14, color: '#6b7280', marginBottom: 32 },
  links:   { display: 'flex', gap: 12, flexWrap: 'wrap' },
  btn:     { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  btnGhost:{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
};
