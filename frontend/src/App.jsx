import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useState, useEffect } from 'react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cultos from './pages/Cultos';
import Louvores from './pages/Louvores';
import Repertorio from './pages/Repertorio';
import Escala from './pages/Escala';
import Membros from './pages/Membros';
import Configuracoes from './pages/Configuracoes';
import Usuarios from './pages/Usuarios';
import CultoPublico from './pages/CultoPublico';
import Estatisticas from './pages/Estatisticas';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, carregando } = useAuth();
  if (carregando) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/culto/:token" element={<CultoPublico />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout theme={theme} toggleTheme={toggleTheme}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/cultos" element={<Cultos />} />
                    <Route path="/louvores" element={<Louvores />} />
                    <Route path="/repertorio" element={<Repertorio />} />
                    <Route path="/escala" element={<Escala />} />
                    <Route path="/membros" element={<Membros />} />
                    <Route path="/estatisticas" element={<Estatisticas />} />
                    <Route path="/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
                    <Route path="/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
