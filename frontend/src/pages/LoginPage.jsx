import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoSvg from '../assets/logo-waveform.svg';
import loginPanel from '../assets/login-panel.svg';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Sign in · HallSense'; }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-split-card">
          <div className="login-left">
            <div className="login-brand">
              <img src={logoSvg} alt="" className="login-brand-logo" />
              <span className="login-brand-text">
                <span className="hall">Hall</span>
                <span className="sense">Sense</span>
              </span>
            </div>

            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to your monitoring console.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              {error && <p className="error-text">{error}</p>}

              <div>
                <label>Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                style={{ width: '100%', height: 48, marginTop: 8, justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          </div>

          <div className="login-right">
            <img src={loginPanel} alt="HallSense — real-time campus monitoring" />
          </div>
        </div>
      </div>
    </div>
  );
}
