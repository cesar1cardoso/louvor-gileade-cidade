import { createContext, useState, useEffect, useCallback } from 'react';
import { auth, setAccessToken, getAccessToken } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const tentarRefresh = useCallback(async () => {
    try {
      const data = await auth.refresh();
      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        setUsuario(payload);
        return true;
      }
    } catch (_) {
      setUsuario(null);
    }
    return false;
  }, []);

  useEffect(() => {
    tentarRefresh().finally(() => setCarregando(false));
  }, [tentarRefresh]);

  const login = async (email, senha) => {
    const data = await auth.login(email, senha);
    setAccessToken(data.accessToken);
    setUsuario(data.usuario);
    return data;
  };

  const logout = async () => {
    try { await auth.logout(); } catch (_) {}
    setAccessToken(null);
    setUsuario(null);
  };

  const isAdmin        = usuario?.role === 'admin';
  const isLiderOuAdmin = usuario?.role === 'admin' || usuario?.role === 'lider';

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, tentarRefresh, isAdmin, isLiderOuAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
