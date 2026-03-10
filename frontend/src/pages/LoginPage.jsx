import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import TextInput from '../components/TextInput';
import { PrimaryButton } from '../components/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">ARDS</div>

      <div className="login-wrap">
        <Card className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
            {error ? <p className="error-text">{error}</p> : null}

            <TextInput
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Value"
              autoFocus
              required
            />

            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Value"
              required
            />

            <PrimaryButton type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
