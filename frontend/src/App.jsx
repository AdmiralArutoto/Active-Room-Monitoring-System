import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AreasPage from './pages/AreasPage';
import SensorsPage from './pages/SensorsPage';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/areas" replace /> : <LoginPage />} />
      <Route path="/areas" element={<ProtectedRoute><AreasPage /></ProtectedRoute>} />
      <Route path="/sensors" element={<ProtectedRoute><SensorsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={token ? '/areas' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
