import { useState, useEffect } from 'react';
import { usuarios as usuariosApi } from '../../services/api';
import { Avatar } from '../../components/Layout';
import styles from './Usuarios.module.css';

function ModalUsuario({ usuario, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    senha: '',
    role: usuario?.role || 'membro',
    ativo: usuario?.ativo !== false,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario && !form.senha) { setErro('Senha é obrigatória para novo usuário'); return; }
    setSalvando(true);
    setErro('');
    try {
      await onSalvar(form);
      onFechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">{usuario ? 'Editar usuário' : 'Novo usuário'}</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
          </div>
          {!usuario && (
            <div className="form-group">
              <label className="form-label">Senha *</label>
              <input type="password" className="input" value={form.senha} onChange={e => setForm(f => ({...f, senha: e.target.value}))} required />
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Perfil</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                <option value="admin">Admin</option>
                <option value="lider">Líder</option>
                <option value="membro">Membro</option>
              </select>
            </div>
            {usuario && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input" value={form.ativo ? 'true' : 'false'} onChange={e => setForm(f => ({...f, ativo: e.target.value === 'true'}))}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            )}
          </div>
          {erro && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <span className="spinner" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalResetSenha({ usuario, onFechar }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (senha !== confirmacao) { setErro('As senhas não coincidem'); return; }
    if (senha.length < 4) { setErro('Senha deve ter ao menos 4 caracteres'); return; }
    setSalvando(true);
    setErro('');
    try {
      await usuariosApi.resetSenha(usuario.id, senha);
      setOk(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (ok) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
        <div className="modal fade-in" style={{ maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ marginBottom: 8 }}>Senha redefinida!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>A senha de <strong>{usuario.nome}</strong> foi alterada com sucesso.</p>
          <button className="btn btn-primary" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2 className="modal-title">Redefinir senha — {usuario.nome}</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nova senha *</label>
            <input type="password" className="input" value={senha} onChange={e => setSenha(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar nova senha *</label>
            <input type="password" className="input" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required />
          </div>
          {erro && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <span className="spinner" /> : 'Redefinir senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [resetando, setResetando] = useState(null);

  const carregar = () => {
    usuariosApi.listar().then(setLista).catch(console.error).finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const handleSalvar = async (form) => {
    if (editando) {
      const payload = { nome: form.nome, email: form.email, role: form.role, ativo: form.ativo };
      await usuariosApi.atualizar(editando.id, payload);
    } else {
      await usuariosApi.criar(form);
    }
    carregar();
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.titulo}>Usuários</h1>
          <p className={styles.subtitulo}>{lista.length} usuários cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditando(null); setModalNovo(true); }}>
          + Novo usuário
        </button>
      </div>

      {carregando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <div className={styles.tabela}>
          <div className={styles.tabelaHeader}>
            <span>Usuário</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Status</span>
            <span>Ações</span>
          </div>
          {lista.map(u => (
            <div key={u.id} className={styles.tabelaRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar nome={u.nome} size={32} />
                <span className={styles.nome}>{u.nome}</span>
              </div>
              <span className={styles.email}>{u.email}</span>
              <span>
                <span className={`badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'lider' ? 'badge-purple' : 'badge-blue'}`}>
                  {u.role === 'admin' ? 'Admin' : u.role === 'lider' ? 'Líder' : 'Membro'}
                </span>
              </span>
              <span>
                <span className={`badge ${u.ativo ? 'badge-green' : 'badge-red'}`}>
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </span>
              <div className={styles.acoes}>
                <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => { setEditando(u); setModalNovo(true); }}>✏️</button>
                <button className="btn btn-ghost btn-sm" title="Redefinir senha" onClick={() => setResetando(u)}>🔑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNovo && (
        <ModalUsuario
          usuario={editando}
          onSalvar={handleSalvar}
          onFechar={() => { setModalNovo(false); setEditando(null); }}
        />
      )}

      {resetando && (
        <ModalResetSenha
          usuario={resetando}
          onFechar={() => setResetando(null)}
        />
      )}
    </div>
  );
}
