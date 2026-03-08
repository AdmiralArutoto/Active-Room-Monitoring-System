import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={{ marginTop: 0 }}>ARDS Login</h2>
        {error && <p style={styles.error}>{error}</p>}
        <label style={styles.label}>Username</label>
        <input
          style={styles.input}
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page:   { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' },
  form:   { background: '#fff', padding: '2rem', borderRadius: 8, width: 320, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  label:  { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 },
  input:  { display: 'block', width: '100%', marginBottom: 16, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: 4 },
  button: { width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 15, cursor: 'pointer' },
  error:  { color: '#dc2626', fontSize: 14, marginBottom: 12 },
};
