import { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    const me = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(me));
    setUser(me);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
