import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await api('/api/me');
      const u = d.success ? d.user : null;
      setUser(u);
      return u; // <-- ito ang idinagdag
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch { /* ignore */ }
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}