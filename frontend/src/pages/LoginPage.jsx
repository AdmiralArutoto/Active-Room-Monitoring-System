import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/shared';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <span style={s.brand}>ARDS</span>

      <form onSubmit={handleSubmit} style={s.card}>
        {error && <p style={s.error}>{error}</p>}

        <label style={s.label}>Username</label>
        <input
          style={s.input}
          placeholder="Value"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input}
          type="password"
          placeholder="Value"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button style={s.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

const s = {
  page:   { display: 'flex', flexDirection: 'column', height: '100vh', background: colors.pageBg, fontFamily: 'system-ui, sans-serif' },
  brand:  { fontSize: 15, fontWeight: 800, color: colors.textPrime, padding: '18px 24px', letterSpacing: '0.02em' },
  card:   { background: colors.white, padding: '32px 36px', borderRadius: 12, width: 340, margin: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  label:  { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: colors.textPrime },
  input:  { display: 'block', width: '100%', marginBottom: 20, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.white, color: colors.textPrime, outline: 'none' },
  button: { width: '100%', padding: '10px', background: colors.action, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
  error:  { color: colors.remove, fontSize: 14, marginBottom: 12 },
};
