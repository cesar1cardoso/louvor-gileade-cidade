import { useState, useEffect } from 'react';
import { louvores as louvoresApi, membros as membrosApi } from '../../../services/api';
import styles from '../Louvores.module.css';

const TONS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
              'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'];

export default function TonsVocalista({ louvorId, isAdmin }) {
  const [tons, setTons] = useState([]);
  const [vocais, setVocais] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ membro_id: '', tom: 'G', observacao: '' });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [t, m] = await Promise.all([
      louvoresApi.tons(louvorId),
      membrosApi.listar(),
    ]);
    setTons(t);
    setVocais(m.filter(v => v.is_vocal));
  };

  useEffect(() => { carregar(); }, [louvorId]);

  const abrirModal = (ton = null) => {
    if (ton) {
      setForm({ membro_id: ton.membro_id, tom: ton.tom, observacao: ton.observacao || '' });
      setEditando(ton);
    } else {
      setForm({ membro_id: '', tom: 'G', observacao: '' });
      setEditando(null);
    }
    setModalAberto(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await louvoresApi.salvarTom(louvorId, form);
      await carregar();
      setModalAberto(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (membroId, nomeVocalista) => {
    if (!confirm(`Remover tom de ${nomeVocalista}?`)) return;
    try {
      await louvoresApi.removerTom(louvorId, membroId);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.tonsSection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Tons por Vocalista</h3>
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => abrirModal()}>+ Adicionar</button>
        )}
      </div>

      {tons.length === 0 ? (
        <p style={{ color: 'var(--dim)', fontSize: 13 }}>Nenhum tom cadastrado ainda.</p>
      ) : (
        <div className={styles.tonsTable}>
          <div className={styles.tonsHeader}>
            <span>Vocalista</span><span>Tom</span><span>Observação</span>{isAdmin && <span></span>}
          </div>
          {tons.map(t => (
            <div key={t.id} className={styles.tonRow}>
              <span style={{ fontWeight: 500 }}>🎤 {t.vocalista_nome}</span>
              <span className="badge badge-gold">{t.tom}</span>
              <span style={{ color: 'var(--dim)', fontSize: 12 }}>{t.observacao || '—'}</span>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => abrirModal(t)}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRemover(t.membro_id, t.vocalista_nome)}>🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalAberto(false)}>
          <div className="modal fade-in" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editando ? 'Editar tom' : 'Adicionar tom'}</h2>
              <button className="modal-close" onClick={() => setModalAberto(false)}>×</button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="form-group">
                <label className="form-label">Vocalista *</label>
                <select className="input" value={form.membro_id} onChange={e => setForm(f => ({...f, membro_id: e.target.value}))} required>
                  <option value="">Selecione...</option>
                  {vocais.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tom *</label>
                <select className="input" value={form.tom} onChange={e => setForm(f => ({...f, tom: e.target.value}))}>
                  {TONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Observação</label>
                <input className="input" value={form.observacao} onChange={e => setForm(f => ({...f, observacao: e.target.value}))} placeholder="Ex: começar suave..." />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? <span className="spinner" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
