import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeedbackProvider } from './context/FeedbackContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SensorsPage from './pages/SensorsPage';
import LogsPage from './pages/LogsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ManagePage from './pages/ManagePage';
import SettingsPage from './pages/SettingsPage';

const ROLE_LEVEL = { VIEWER: 0, MANAGER: 1, ADMIN: 2 };

function ProtectedRoute({ children, minRole }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (minRole && (ROLE_LEVEL[user?.role] ?? 0) < ROLE_LEVEL[minRole]) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute minRole="MANAGER"><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/sensors"   element={<ProtectedRoute minRole="MANAGER"><AppLayout><SensorsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/logs"      element={<ProtectedRoute minRole="MANAGER"><AppLayout><LogsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manage"    element={<ProtectedRoute minRole="ADMIN"><AppLayout><ManagePage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings"  element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="*"          element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FeedbackProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FeedbackProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
