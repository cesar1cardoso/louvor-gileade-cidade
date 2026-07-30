import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Layout.module.css';

const NAV_BASE = [
  { to: '/dashboard',   icon: '🏠', label: 'Dashboard' },
 { to: '/cultos',      icon: <img src="/logo-casaviva.png" alt="" className="nav-icon-logo" />, label: 'Cultos' },
  { to: '/louvores',   icon: '🎵', label: 'Louvores' },
  { to: '/repertorio', icon: '📋', label: 'Repertório' },
  { to: '/escala',     icon: '👥', label: 'Escala' },
  { to: '/membros',    icon: '🎸', label: 'Membros' },
  { to: '/estatisticas', icon: '📊', label: 'Estatísticas' },
];
const NAV_ADMIN = [
  { to: '/usuarios',      icon: '👤', label: 'Usuários' },
  { to: '/configuracoes', icon: '⚙️', label: 'Configurações' },
];

function Avatar({ nome, size = 36 }) {
  const iniciais = nome ? nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?';
  const cores = ['#c9a84c', '#28a888', '#4878c8', '#8048c8', '#f4900c', '#d05050'];
  const cor = cores[nome?.charCodeAt(0) % cores.length] || '#c9a84c';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: cor, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600,
      color: '#000', flexShrink: 0,
    }}>
      {iniciais}
    </div>
  );
}

export { Avatar };

export default function Layout({ children, theme, toggleTheme }) {
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false);
  const { usuario, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? [...NAV_BASE, ...NAV_ADMIN] : NAV_BASE;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fecharMenuMobile = () => setMobileMenuAberto(false);

  const rootClass = [
    styles.root,
    sidebarAberta ? styles.sidebarOpen : styles.sidebarClosed,
    mobileMenuAberto ? styles.mobileSidebarOpen : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {/* Overlay mobile */}
      <div className={styles.overlay} onClick={fecharMenuMobile} />

      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoArea}>
            <img src="/logo-casaviva.png" alt="Logo" className={styles.logoImg} />
            {sidebarAberta && (
              <div className={styles.logoText}>
                <span className={styles.logoLouvor}>Louvor</span>
                <span className={styles.logoCasaViva}>Gileade Cidade</span>
              </div>
            )}
          </div>
          <button className={styles.toggleBtn} onClick={() => setSidebarAberta(v => !v)} title="Alternar sidebar">
            ☰
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={!sidebarAberta ? item.label : undefined}
              onClick={fecharMenuMobile}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {sidebarAberta && <span className={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {usuario && (
            <div className={styles.userArea}>
              <Avatar nome={usuario.nome} size={32} />
              {sidebarAberta && (
                <div className={styles.userName}>
                  <span className={styles.userNome}>{usuario.nome}</span>
                  <span className={styles.userRole}>{usuario.role}</span>
                </div>
              )}
            </div>
          )}
          {sidebarAberta && (
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
              ↩ Sair
            </button>
          )}
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {/* Botão visível apenas no mobile */}
            <button className={styles.menuBtnMobile} onClick={() => setMobileMenuAberto(v => !v)} aria-label="Menu">
              ☰
            </button>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.themeToggle} onClick={toggleTheme} title="Alternar tema">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {usuario && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar nome={usuario.nome} size={30} />
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{usuario.nome}</span>
              </div>
            )}
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
