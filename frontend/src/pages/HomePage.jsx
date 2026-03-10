import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { GhostButton, PrimaryButton } from '../components/Button';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <PageTitle>Home</PageTitle>

      <Card style={{ padding: 20, maxWidth: 620 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>Welcome back, {user?.username}.</h2>
        <p className="muted-text" style={{ margin: '0 0 18px' }}>
          ARDS - Area & Room Dashboard System
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PrimaryButton onClick={() => navigate('/dashboard')}>Open Dashboard</PrimaryButton>
          <GhostButton onClick={() => navigate('/areas')}>Manage Areas</GhostButton>
          <GhostButton onClick={() => navigate('/sensors')}>Manage Sensors</GhostButton>
        </div>
      </Card>
    </div>
  );
}
