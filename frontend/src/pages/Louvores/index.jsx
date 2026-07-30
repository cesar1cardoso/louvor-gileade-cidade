import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { louvores as louvoresApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LouvorDetail from './components/LouvorDetail';
import styles from './Louvores.module.css';

const TIPOS = ['Adoração','Louvor','Comunhão'];
const TONS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
              'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'];

const TIPO_BADGE = {
  'Adoração': 'badge-purple',
  'Louvor':   'badge-gold',
  'Comunhão': 'badge-dim',
};

function ModalNovoLouvor({ onSalvar, onFechar }) {
  const [form, setForm] = useState({
    titulo: '', artista: '', tom: '', bpm: '', compasso: '4/4',
    tipo: '', tags: [], letra: '', cifra_url: '', youtube_url: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await onSalvar(form);
      onFechar();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  const adicionarTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2 className="modal-title">Novo louvor</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="input" value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))} required autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Artista</label>
              <input className="input" value={form.artista} onChange={e => setForm(f => ({...f, artista: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}>
                <option value="">Selecione...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Tom</label>
              <select className="input" value={form.tom} onChange={e => setForm(f => ({...f, tom: e.target.value}))}>
                <option value="">—</option>
                {TONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">BPM</label>
              <input type="number" className="input" value={form.bpm} onChange={e => setForm(f => ({...f, bpm: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Compasso</label>
              <input className="input" value={form.compasso} onChange={e => setForm(f => ({...f, compasso: e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {form.tags.map(tag => (
                <span key={tag} className="badge badge-dim" style={{ cursor: 'pointer' }} onClick={() => setForm(f => ({...f, tags: f.tags.filter(t => t !== tag)}))}>
                  {tag} ×
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarTag())}
                placeholder="Tag... (Enter)" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={adicionarTag}>+</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">URL da Cifra (Cifra Club)</label>
            <input type="url" className="input" value={form.cifra_url} onChange={e => setForm(f => ({...f, cifra_url: e.target.value}))} placeholder="https://www.cifraclub.com.br/..." />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube</label>
            <input className="input" value={form.youtube_url} onChange={e => setForm(f => ({...f, youtube_url: e.target.value}))} placeholder="https://www.youtube.com/watch?v=..." />
          </div>
          {erro && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <span className="spinner" /> : 'Criar louvor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Louvores() {
  const { isLiderOuAdmin: isAdmin } = useAuth();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [buscaInput, setBuscaInput] = useState('');   // valor do input (imediato)
  const [busca, setBusca] = useState('');              // valor debounced (dispara fetch)
  const [filtroTipo, setFiltroTipo] = useState('');
  const [ordem, setOrdem] = useState('recente');
  const [louvorSelecionado, setLouvorSelecionado] = useState(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [semUso, setSemUso] = useState(new Set());
  const debounceRef = useRef(null);
  const location = useLocation();
  const locationStateApplied = useRef(false);

  // Abrir louvor direto quando vindo de outra página (ex: Dashboard)
  useEffect(() => {
    if (!locationStateApplied.current && location.state?.louvorId) {
      locationStateApplied.current = true;
      setLouvorSelecionado(location.state.louvorId);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Debounce: atualiza `busca` 400ms após o usuário parar de digitar
  const handleBuscaChange = (e) => {
    const val = e.target.value;
    setBuscaInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBusca(val), 400);
  };

  const carregar = async () => {
    setCarregando(true);
    try {
      const params = { ordem };
      if (busca) params.busca = busca;
      if (filtroTipo) params.tipo = filtroTipo;
      const [l, su] = await Promise.all([
        louvoresApi.listar(params),
        louvoresApi.semUso().catch(() => []),
      ]);
      setLista(l);
      setSemUso(new Set(su.map(s => s.id)));
    } catch (err) {
      console.error('Erro ao carregar louvores:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, [busca, filtroTipo, ordem]);

  // Criar louvor: fecha modal e seleciona o recém-criado automaticamente
  const handleCriar = async (form) => {
    const novoLouvor = await louvoresApi.criar(form);
    await carregar();
    setLouvorSelecionado(novoLouvor.id);
  };

  const handleRemover = async (louvor, e) => {
    e.stopPropagation();
    if (!confirm(`Remover "${louvor.titulo}"?`)) return;
    try {
      await louvoresApi.remover(louvor.id);
      if (louvorSelecionado === louvor.id) setLouvorSelecionado(null);
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={`${styles.page} ${louvorSelecionado ? styles.paginaDetalhe : ''}`}>
      <div className={styles.esquerda}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.titulo}>Louvores</h1>
            <p className={styles.subtitulo}>{lista.length} músicas</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setModalNovo(true)}>+ Novo</button>
          )}
        </div>

        <div className={styles.filtros}>
          <input
            className="input"
            placeholder="🔍 Buscar por título, artista ou letra..."
            value={buscaInput}
            onChange={handleBuscaChange}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ flex: 1 }}>
              <option value="">Todos os tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              className={`btn btn-sm ${ordem === 'recente' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setOrdem(o => o === 'recente' ? 'alfabetica' : 'recente')}
              title={ordem === 'recente' ? 'Ordenar A-Z' : 'Ordenar por mais recente'}
              style={{ flexShrink: 0, minWidth: 52 }}
            >
              {ordem === 'recente' ? '🕐' : 'A-Z'}
            </button>
          </div>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : lista.length === 0 ? (
          <div className={styles.vazio}>
            <div style={{ fontSize: 40 }}>🎵</div>
            <p>{buscaInput || filtroTipo ? 'Nenhum resultado.' : 'Nenhum louvor cadastrado.'}</p>
            {isAdmin && !buscaInput && !filtroTipo && (
              <button className="btn btn-primary" onClick={() => setModalNovo(true)}>Adicionar primeiro louvor</button>
            )}
          </div>
        ) : (
          <div className={styles.listaLouvores}>
            {lista.map(louvor => (
              <div
                key={louvor.id}
                className={`${styles.louvorItem} ${louvorSelecionado === louvor.id ? styles.louvorSelecionado : ''}`}
                onClick={() => setLouvorSelecionado(louvor.id === louvorSelecionado ? null : louvor.id)}
              >
                <div className={styles.louvorInfo}>
                  <div className={styles.louvorTitulo}>{louvor.titulo}</div>
                  <div className={styles.louvorArtista}>{louvor.artista}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {louvor.tom && <span className="badge badge-gold">{louvor.tom}</span>}
                    {louvor.tipo && <span className={`badge ${TIPO_BADGE[louvor.tipo] || 'badge-dim'}`}>{louvor.tipo}</span>}
                    {semUso.has(louvor.id) && <span className="badge badge-red">Há muito tempo</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" onClick={(e) => handleRemover(louvor, e)} style={{ opacity: 0.6 }}>
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {louvorSelecionado && (
        <div className={styles.direita}>
          <button className={styles.btnVoltar} onClick={() => setLouvorSelecionado(null)}>
            ← Voltar
          </button>
          <LouvorDetail
            louvorId={louvorSelecionado}
            isAdmin={isAdmin}
            onFechar={() => setLouvorSelecionado(null)}
            onAtualizado={carregar}
          />
        </div>
      )}

      {modalNovo && (
        <ModalNovoLouvor onSalvar={handleCriar} onFechar={() => setModalNovo(false)} />
      )}
    </div>
  );
}
