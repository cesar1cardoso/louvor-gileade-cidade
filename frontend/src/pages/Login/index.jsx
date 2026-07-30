import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destino = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>🎵</div>
          <div className={styles.logoText}>
            <span className={styles.logoLouvor}>Louvor</span>
            <span className={styles.logoCasaViva}>Gileade Cidade</span>
          </div>
        </div>

        <h1 className={styles.titulo}>Entrar no sistema</h1>
        <p className={styles.subtitulo}>Acesse com suas credenciais de administrador</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="input"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {erro && <div className={styles.erro}>{erro}</div>}

          <button type="submit" className={`btn btn-primary ${styles.btnLogin}`} disabled={carregando}>
            {carregando ? <span className="spinner" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
