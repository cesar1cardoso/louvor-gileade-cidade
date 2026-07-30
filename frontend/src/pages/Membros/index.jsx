import { useState, useEffect } from 'react';
import { membros as membrosApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/Layout';
import InstrumentosForm from './components/InstrumentosForm';
import RepertorioMembro from './components/RepertorioMembro';
import styles from './Membros.module.css';

function ModalMembro({ membro, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: membro?.nome || '',
    telefone: membro?.telefone || '',
    email: membro?.email || '',
    is_vocal: membro?.is_vocal || false,
    tipo: membro?.tipo || 'fixo',
    instrumentos: membro?.instrumentos || [],
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      <div className="modal fade-in" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 className="modal-title">{membro ? 'Editar membro' : 'Novo membro'}</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} required autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="input" value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <input type="checkbox" id="is_vocal" checked={form.is_vocal} onChange={e => setForm(f => ({...f, is_vocal: e.target.checked}))} />
              <label htmlFor="is_vocal" className="form-label" style={{ marginBottom: 0 }}>🎤 É vocal</label>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}>
                <option value="fixo">Fixo</option>
                <option value="visitante">Visitante</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Instrumentos</label>
            <InstrumentosForm value={form.instrumentos} onChange={insts => setForm(f => ({...f, instrumentos: insts}))} />
            <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              Deixe em branco se o membro é somente vocal.
            </span>
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

function ModalDisponibilidade({ membro, onFechar }) {
  const [indisponibilidades, setIndisponibilidades] = useState([]);
  const [tipo, setTipo] = useState('periodo'); // 'periodo' | 'dia'
  const [form, setForm] = useState({ data_inicio: '', data_fim: '', motivo: '' });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const data = await membrosApi.disponibilidade(membro.id);
    setIndisponibilidades(data);
  };

  useEffect(() => { carregar(); }, [membro.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await membrosApi.adicionarIndisponibilidade(membro.id, form);
      await carregar();
      setForm({ data_inicio: '', data_fim: '', motivo: '' }); setTipo('periodo');
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (dId) => {
    try {
      await membrosApi.removerIndisponibilidade(membro.id, dId);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">Disponibilidade — {membro.nome}</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>Datas indisponíveis</h3>

        {indisponibilidades.length === 0 ? (
          <p style={{ color: 'var(--dim)', fontSize: 13, marginBottom: 16 }}>Nenhuma indisponibilidade registrada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {indisponibilidades.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13 }}>
                    {new Date(i.data_inicio).toLocaleDateString('pt-BR')} — {new Date(i.data_fim).toLocaleDateString('pt-BR')}
                  </div>
                  {i.motivo && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{i.motivo}</div>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleRemover(i.id)}>🗑️</button>
              </div>
            ))}
          </div>
        )}

        <hr className="divider" />
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Adicionar indisponibilidade</h3>

        {/* Toggle Período / Dia único */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => { setTipo('periodo'); setForm(f => ({...f, data_fim: ''})); }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              background: tipo === 'periodo' ? 'var(--gold)' : 'var(--surface)',
              color: tipo === 'periodo' ? '#000' : 'var(--muted)',
              border: tipo === 'periodo' ? 'none' : '1px solid var(--border)',
            }}
          >
            📅 Período
          </button>
          <button
            type="button"
            onClick={() => { setTipo('dia'); setForm(f => ({...f, data_fim: f.data_inicio})); }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              background: tipo === 'dia' ? 'var(--gold)' : 'var(--surface)',
              color: tipo === 'dia' ? '#000' : 'var(--muted)',
              border: tipo === 'dia' ? 'none' : '1px solid var(--border)',
            }}
          >
            📌 Dia único
          </button>
        </div>

        <form onSubmit={handleAdd}>
          {tipo === 'periodo' ? (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Início *</label>
                <input type="date" className="input" value={form.data_inicio}
                  onChange={e => setForm(f => ({...f, data_inicio: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Fim *</label>
                <input type="date" className="input" value={form.data_fim}
                  onChange={e => setForm(f => ({...f, data_fim: e.target.value}))} required />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input type="date" className="input" value={form.data_inicio}
                onChange={e => setForm(f => ({...f, data_inicio: e.target.value, data_fim: e.target.value}))} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Motivo</label>
            <input className="input" value={form.motivo} onChange={e => setForm(f => ({...f, motivo: e.target.value}))} placeholder="Opcional..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Fechar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <span className="spinner" /> : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Membros() {
  const { isAdmin, isLiderOuAdmin } = useAuth();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [membroEditando, setMembroEditando] = useState(null);
  const [modalDisp, setModalDisp] = useState(null);
  const [perfilAberto, setPerfilAberto] = useState(null);
  const [abaPerfil, setAbaPerfil] = useState('info');

  const carregar = () => {
    membrosApi.listar().then(setLista).catch(console.error).finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const handleSalvar = async (form) => {
    if (membroEditando) {
      await membrosApi.atualizar(membroEditando.id, form);
    } else {
      await membrosApi.criar(form);
    }
    carregar();
  };

  const handleInativar = async (membro) => {
    if (!confirm(`Inativar ${membro.nome}?`)) return;
    try {
      await membrosApi.inativar(membro.id);
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const membroAtual = lista.find(m => m.id === perfilAberto);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.titulo}>Membros</h1>
          <p className={styles.subtitulo}>{lista.length} membros ativos</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setMembroEditando(null); setModalNovo(true); }}>+ Novo membro</button>
        )}
      </div>

      {carregando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : lista.length === 0 ? (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>👥</div>
          <p>Nenhum membro cadastrado.</p>
          {isAdmin && <button className="btn btn-primary" onClick={() => setModalNovo(true)}>Adicionar membro</button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {lista.map(membro => (
            <div
              key={membro.id}
              className={`${styles.card} ${perfilAberto === membro.id ? styles.cardSelecionado : ''}`}
              onClick={() => setPerfilAberto(perfilAberto === membro.id ? null : membro.id)}
            >
              <div className={styles.cardTop}>
                <Avatar nome={membro.nome} size={48} />
                <div style={{ flex: 1 }}>
                  <div className={styles.cardNome}>{membro.nome}</div>
                  {membro.tipo === 'visitante' && <span className="badge badge-orange">Visitante</span>}
                </div>
              </div>
              <div className={styles.cardInstrumentos}>
                {(membro.instrumentos || []).slice(0, 2).map(i => (
                  <span key={i.instrumento_id} className="badge badge-dim">{i.instrumento_icone} {i.instrumento_nome}</span>
                ))}
                {membro.is_vocal && <span className="badge badge-purple">🎤 Vocal</span>}
              </div>
              {isLiderOuAdmin && (
                <div className={styles.cardAcoes} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setMembroEditando(membro); setModalNovo(true); }}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModalDisp(membro)}>📅</button>
                  {isAdmin && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleInativar(membro)}>🚫</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {perfilAberto && membroAtual && (
        <div className={styles.perfilPanel}>
          <div className={styles.perfilHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar nome={membroAtual.nome} size={52} />
              <div>
                <div className={styles.perfilNome}>{membroAtual.nome}</div>
                {membroAtual.telefone && <div style={{ fontSize: 13, color: 'var(--muted)' }}>📱 {membroAtual.telefone}</div>}
                {membroAtual.email && <div style={{ fontSize: 13, color: 'var(--muted)' }}>✉️ {membroAtual.email}</div>}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPerfilAberto(null)}>✕</button>
          </div>

          <div className="abas" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {['info', ...(membroAtual.is_vocal ? ['repertorio'] : [])].map(a => (
              <button
                key={a}
                style={{
                  background: 'none', border: 'none', borderBottom: abaPerfil === a ? '2px solid var(--gold)' : '2px solid transparent',
                  padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  color: abaPerfil === a ? 'var(--gold)' : 'var(--muted)', marginBottom: -1,
                }}
                onClick={() => setAbaPerfil(a)}
              >
                {{ info: 'Informações', repertorio: 'Repertório & Tons' }[a]}
              </button>
            ))}
          </div>

          {abaPerfil === 'info' && (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {membroAtual.is_vocal && <span className="badge badge-purple">🎤 Vocal</span>}
                <span className={`badge ${membroAtual.tipo === 'fixo' ? 'badge-blue' : 'badge-orange'}`}>
                  {membroAtual.tipo === 'fixo' ? 'Membro fixo' : 'Visitante'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>Instrumentos</div>
                {(membroAtual.instrumentos || []).map(i => (
                  <div key={i.instrumento_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{i.instrumento_icone}</span>
                    <span style={{ fontSize: 14 }}>{i.instrumento_nome}</span>
                    {i.ordem === 1 && <span className="badge badge-gold">Principal</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {abaPerfil === 'repertorio' && membroAtual.is_vocal && (
            <RepertorioMembro membroId={membroAtual.id} isAdmin={isLiderOuAdmin} />
          )}
        </div>
      )}

      {modalNovo && (
        <ModalMembro
          membro={membroEditando}
          onSalvar={handleSalvar}
          onFechar={() => { setModalNovo(false); setMembroEditando(null); }}
        />
      )}

      {modalDisp && (
        <ModalDisponibilidade
          membro={modalDisp}
          onFechar={() => setModalDisp(null)}
        />
      )}
    </div>
  );
}
