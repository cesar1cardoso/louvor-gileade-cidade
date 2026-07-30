import { useState, useEffect } from 'react';
import { escalas as escalasApi, membros as membrosApi, instrumentos as instrumentosApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/Layout';
import ConvidadoForm from './components/ConvidadoForm';
import { useCultoProximo, mesLabel, mesChave } from '../../hooks/useCultoProximo';
import styles from './Escala.module.css';

export default function Escala() {
  const { usuario, isLiderOuAdmin: isAdmin } = useAuth();

  const {
    cultosAll, cultosFiltrados, mesesDisponiveis,
    cultoId, setCultoId, mesSelecionado, setMesSelecionado, cultoAtual,
  } = useCultoProximo();

  const [escalaItens, setEscalaItens] = useState([]);
  const [membrosLista, setMembrosLista] = useState([]);
  const [todosInstrumentos, setTodosInstrumentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [modalMembro, setModalMembro] = useState(false);
  const [modalConvidado, setModalConvidado] = useState(false);
  const [formMembro, setFormMembro] = useState({ membro_id: '', instrumento_id: '', is_vocal: false });
  const [salvando, setSalvando] = useState(false);
  const [editandoOverride, setEditandoOverride] = useState(null);
  const [overrideValor, setOverrideValor] = useState('');
  const [salvandoOverride, setSalvandoOverride] = useState(false);
  const [idsIndisponiveis, setIdsIndisponiveis] = useState(new Set());

  useEffect(() => {
    Promise.all([membrosApi.listar(), instrumentosApi.listar()])
      .then(([m, inst]) => { setMembrosLista(m); setTodosInstrumentos(inst); })
      .catch(console.error);
  }, []);

  const carregarEscala = async (id) => {
    setCarregando(true);
    try {
      const e = await escalasApi.buscar(id);
      setEscalaItens(e);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (cultoId) carregarEscala(cultoId);
    else setEscalaItens([]);
  }, [cultoId]);

  // Carrega membros indisponíveis quando o culto selecionado muda
  useEffect(() => {
    if (!cultoAtual?.data_hora) { setIdsIndisponiveis(new Set()); return; }
    const dataCulto = String(cultoAtual.data_hora).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!dataCulto) return;
    membrosApi.indisponibilidadesData(dataCulto)
      .then(ids => setIdsIndisponiveis(new Set(ids)))
      .catch(() => setIdsIndisponiveis(new Set()));
  }, [cultoAtual?.data_hora]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdicionarMembro = async (e) => {
    e.preventDefault();

    setSalvando(true);
    try {
      const data = await escalasApi.adicionar({
        culto_id: parseInt(cultoId),
        ...formMembro,
        membro_id: parseInt(formMembro.membro_id),
        instrumento_id: formMembro.instrumento_id ? parseInt(formMembro.instrumento_id) : null,
      });
      if (data.aviso_indisponibilidade) {
        alert('⚠️ Atenção: este membro está marcado como indisponível nesta data!');
      }
      await carregarEscala(cultoId);
      setModalMembro(false);
      setFormMembro({ membro_id: '', instrumento_id: '', is_vocal: false });
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmar = async (id) => {
    try {
      await escalasApi.confirmar(id);
      await carregarEscala(cultoId);
    } catch (err) { alert(err.message); }
  };

  const handleRemover = async (id) => {
    if (!confirm('Remover da escala?')) return;
    try {
      await escalasApi.remover(id);
      await carregarEscala(cultoId);
    } catch (err) { alert(err.message); }
  };

  const handleSalvarOverride = async (itemId) => {
    setSalvandoOverride(true);
    try {
      await escalasApi.atualizarInstrumento(itemId, overrideValor || null);
      await carregarEscala(cultoId);
      setEditandoOverride(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoOverride(false);
    }
  };

  const membroSelecionado = membrosLista.find(m => m.id === parseInt(formMembro.membro_id));
  const instrumentosDoMembro = membroSelecionado?.instrumentos || [];

  const total = escalaItens.length;
  const confirmados = escalaItens.filter(e => e.confirmado).length;
  const progressoPct = total > 0 ? (confirmados / total) * 100 : 0;

  const formatarData = (dt) => new Date(dt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.titulo}>Escala</h1>
          {cultoAtual && <p className={styles.subtitulo}>{cultoAtual.nome} · {formatarData(cultoAtual.data_hora)}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {mesesDisponiveis.length > 1 && (
            <select className="input" style={{ maxWidth: 180 }} value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)}>
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{mesLabel(cultosAll.find(c => mesChave(c.data_hora) === m)?.data_hora || '')}</option>
              ))}
            </select>
          )}
          <select className="input" style={{ maxWidth: 280 }} value={cultoId} onChange={e => setCultoId(e.target.value)}>
            <option value="">Selecionar culto...</option>
            {cultosFiltrados.map(c => (
              <option key={c.id} value={c.id}>
                {new Date(c.data_hora).toLocaleDateString('pt-BR')} — {c.nome}
              </option>
            ))}
          </select>
          {isAdmin && cultoId && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setModalMembro(true)}>+ Membro</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setModalConvidado(true)}>+ Convidado</button>
            </>
          )}
        </div>
      </div>

      {cultosAll.length === 0 && (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>📅</div>
          <p>Nenhum culto agendado encontrado.</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cultos passados não são exibidos.</p>
        </div>
      )}

      {!cultoId && cultosAll.length > 0 && (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>👥</div>
          <p>Selecione um culto para ver ou montar a escala.</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cultos passados não são exibidos.</p>
        </div>
      )}

      {cultoId && carregando && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      )}

      {cultoId && !carregando && (
        <>
          {total > 0 && (
            <div className={styles.progresso}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Confirmações</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{confirmados}/{total}</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressoPct}%` }} />
              </div>
            </div>
          )}

          {escalaItens.length === 0 ? (
            <div className={styles.vazio}>
              <p>Nenhum membro escalado ainda.</p>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setModalMembro(true)}>+ Adicionar membro</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setModalConvidado(true)}>+ Convidado</button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.escalaGrid}>
              {escalaItens.map(item => {
                const isConvidado = !item.membro_id;
                const nome = isConvidado ? item.convidado_nome : item.membro_nome;
                const instrumentoNome = isConvidado
                  ? item.convidado_instrumento
                  : (item.instrumento_override || item.instrumento_nome);
                const isVocal = isConvidado ? item.convidado_vocal : item.is_vocal;
                const temOverride = !isConvidado && !!item.instrumento_override;

                return (
                  <div key={item.id} className={`${styles.membroCard} ${item.confirmado ? styles.confirmado : ''}`}>
                    <div className={styles.cardHeader}>
                      <Avatar nome={nome} size={44} />
                      {isConvidado && <span className="badge badge-orange">Convidado</span>}
                      {item.confirmado && <span className="badge badge-green">✓ Confirmado</span>}
                    </div>
                    <div className={styles.cardNome}>{nome}</div>

                    {/* Instrumento — exibição normal ou editor inline */}
                    {isAdmin && !isConvidado && editandoOverride === item.id ? (
                      <div style={{ marginTop: 6 }}>
                        <select
                          className="input"
                          style={{ fontSize: 13, marginBottom: 4 }}
                          value={overrideValor}
                          onChange={e => setOverrideValor(e.target.value)}
                          autoFocus
                        >
                          <option value="">— Padrão ({item.instrumento_nome || 'nenhum'}) —</option>
                          <option value="Vocal">🎤 Vocal</option>
                          {todosInstrumentos.map(i => (
                            <option key={i.id} value={i.nome}>{i.icone} {i.nome}</option>
                          ))}
                        </select>
                        <p style={{ fontSize: 11, color: 'var(--orange)', marginBottom: 6 }}>
                          Válido somente para este culto. O cadastro do membro não será alterado.
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSalvarOverride(item.id)} disabled={salvandoOverride}>
                            {salvandoOverride ? <span className="spinner" /> : 'Salvar'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditandoOverride(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.cardInfo}>
                        {instrumentoNome && (
                          <span>
                            {item.instrumento_icone || '🎵'} {instrumentoNome}
                            {temOverride && <span style={{ fontSize: 11, color: 'var(--orange)', marginLeft: 4 }}>(neste culto)</span>}
                          </span>
                        )}
                        {isVocal && <span>🎤 Vocal</span>}
                        {isAdmin && !isConvidado && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '2px 6px', marginLeft: 4 }}
                            onClick={() => { setEditandoOverride(item.id); setOverrideValor(item.instrumento_override || ''); }}
                          >
                            ✏
                          </button>
                        )}
                      </div>
                    )}

                    <div className={styles.cardAcoes}>
                      {!item.confirmado && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleConfirmar(item.id)}>
                          ✓ Confirmar
                        </button>
                      )}
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRemover(item.id)}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: adicionar membro fixo */}
      {modalMembro && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalMembro(false)}>
          <div className="modal fade-in" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Adicionar membro fixo</h2>
              <button className="modal-close" onClick={() => setModalMembro(false)}>×</button>
            </div>
            <form onSubmit={handleAdicionarMembro}>
              <div className="form-group">
                <label className="form-label">Membro *</label>
                <select className="input" value={formMembro.membro_id} onChange={e => setFormMembro(f => ({...f, membro_id: e.target.value, instrumento_id: ''}))} required>
                  <option value="">Selecione...</option>
                  {/* Disponíveis */}
                  {membrosLista.filter(m => !idsIndisponiveis.has(m.id)).map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                  {/* Indisponíveis — aparecem mas não podem ser selecionados */}
                  {membrosLista.filter(m => idsIndisponiveis.has(m.id)).length > 0 && (
                    <optgroup label="⛔ Indisponíveis nesta data">
                      {membrosLista.filter(m => idsIndisponiveis.has(m.id)).map(m => (
                        <option key={m.id} value={m.id} disabled>
                          {m.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              {instrumentosDoMembro.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Instrumento</label>
                  <select className="input" value={formMembro.instrumento_id} onChange={e => setFormMembro(f => ({...f, instrumento_id: e.target.value}))}>
                    <option value="">Selecione...</option>
                    {instrumentosDoMembro.map(i => (
                      <option key={i.instrumento_id} value={i.instrumento_id}>
                        {i.instrumento_icone} {i.instrumento_nome} {i.ordem === 1 ? '(principal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {instrumentosDoMembro.length === 0 && membroSelecionado && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                  🎤 Membro sem instrumento cadastrado — será escalado como Vocal.
                </p>
              )}
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="is-vocal" checked={formMembro.is_vocal} onChange={e => setFormMembro(f => ({...f, is_vocal: e.target.checked}))} />
                <label htmlFor="is-vocal" className="form-label" style={{ marginBottom: 0 }}>🎤 Escalado como vocal</label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalMembro(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? <span className="spinner" /> : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConvidado && (
        <ConvidadoForm
          cultoId={parseInt(cultoId)}
          onSalvar={() => carregarEscala(cultoId)}
          onFechar={() => setModalConvidado(false)}
        />
      )}
    </div>
  );
}
