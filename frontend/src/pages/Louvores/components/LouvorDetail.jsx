import { useState, useEffect } from 'react';
import { louvores as louvoresApi } from '../../../services/api';
import LetraViewer from './LetraViewer';
import YoutubePlayer from './YoutubePlayer';
import TonsVocalista from './TonsVocalista';
import CifraViewer from './CifraViewer';
import CifraEditor from './CifraEditor';
import { extractTomFromCifra } from '../../../utils/cifra';
import styles from '../Louvores.module.css';

const TIPOS = ['Adoração','Louvor','Comunhão'];
const TONS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B',
              'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'];

export default function LouvorDetail({ louvorId, isAdmin, onFechar, onAtualizado }) {
  const [louvor, setLouvor] = useState(null);
  const [aba, setAba] = useState('info');
  const [editandoInfo, setEditandoInfo] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Sub-aba Cifra
  const [cifraSubAba, setCifraSubAba] = useState('visualizar');
  const [cifraTextoLocal, setCifraTextoLocal] = useState(null);
  const [cifraUrlLocal, setCifraUrlLocal] = useState(null);
  const [editandoCifraUrl, setEditandoCifraUrl] = useState(false);
  const [cifraUrlInput, setCifraUrlInput] = useState('');
  const [salvandoCifraUrl, setSalvandoCifraUrl] = useState(false);

  // Historico — carregado sob demanda
  const [historicoData, setHistoricoData] = useState(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const carregar = async () => {
    const l = await louvoresApi.buscar(louvorId);
    setLouvor(l);
    setCifraTextoLocal(l.cifra_texto ?? null);
    setCifraUrlLocal(l.cifra_url ?? null);
    setForm({
      titulo: l.titulo, artista: l.artista || '', tom: l.tom || '',
      bpm: l.bpm || '', compasso: l.compasso || '4/4',
      tipo: l.tipo || '', tags: l.tags || [], cifra_url: l.cifra_url || '',
    });
  };

  const carregarHistorico = async () => {
    if (historicoData) return;
    setCarregandoHistorico(true);
    try {
      const h = await louvoresApi.historico(louvorId);
      setHistoricoData(h);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  useEffect(() => { carregar(); }, [louvorId]);

  const handleAbaChange = (a) => {
    setAba(a);
    if (a === 'historico') carregarHistorico();
  };

  const handleSalvarInfo = async () => {
    setSalvando(true);
    try {
      await louvoresApi.atualizar(louvorId, { ...form, tags: form.tags });
      await carregar();
      setEditandoInfo(false);
      onAtualizado?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleAtualizarLetra = async (letra) => {
    await louvoresApi.atualizarLetra(louvorId, letra);
    await carregar();
  };

  const handleAtualizarYoutube = async (url) => {
    await louvoresApi.atualizarYoutube(louvorId, url);
    await carregar();
  };

  const adicionarTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removerTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  if (!louvor) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  // Tom resolvido: usa o banco de dados primeiro, depois extrai da cifra
  const tomResolvido = louvor.tom || extractTomFromCifra(cifraTextoLocal) || 'G';

  const formatarData = (dt) => new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const ABA_LABELS = { info: 'Informações', letra: 'Letra', cifra: 'Cifra', youtube: 'YouTube', historico: 'Histórico' };

  return (
    <div className={styles.detalhe}>
      <div className={styles.detalheHeader}>
        <div>
          <h2 className={styles.detalheTitulo}>{louvor.titulo}</h2>
          {louvor.artista && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{louvor.artista}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setEditandoInfo(true)}>✏️ Editar</button>}
          <button className="btn btn-ghost btn-sm" onClick={onFechar}>✕</button>
        </div>
      </div>

      <div className={styles.abas}>
        {['info','letra','cifra','youtube','historico'].map(a => (
          <button
            key={a}
            className={`${styles.aba} ${aba === a ? styles.abaAtiva : ''}`}
            onClick={() => handleAbaChange(a)}
          >
            {ABA_LABELS[a]}
          </button>
        ))}
      </div>

      <div className={styles.abaContent}>
        {aba === 'info' && (
          <div>
            {editandoInfo ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="input" value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Artista</label>
                    <input className="input" value={form.artista} onChange={e => setForm(f => ({...f, artista: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select className="input" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}>
                      <option value="">—</option>
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
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {form.tags.map(tag => (
                      <span key={tag} className="badge badge-dim" style={{ cursor: 'pointer' }} onClick={() => removerTag(tag)}>
                        {tag} ×
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" style={{ flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarTag())}
                      placeholder="Nova tag... (Enter para adicionar)" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={adicionarTag}>+</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link da cifra</label>
                  <input className="input" value={form.cifra_url} onChange={e => setForm(f => ({...f, cifra_url: e.target.value}))} placeholder="https://..." />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleSalvarInfo} disabled={salvando}>
                    {salvando ? <span className="spinner" /> : 'Salvar'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditandoInfo(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                <div className={styles.infoGrid}>
                  {louvor.tom && <div className={styles.infoItem}><span className={styles.infoLabel}>Tom</span><span className="badge badge-gold">{louvor.tom}</span></div>}
                  {louvor.bpm && <div className={styles.infoItem}><span className={styles.infoLabel}>BPM</span><span className={styles.infoValor}>{louvor.bpm}</span></div>}
                  {louvor.compasso && <div className={styles.infoItem}><span className={styles.infoLabel}>Compasso</span><span className={styles.infoValor}>{louvor.compasso}</span></div>}
                  {louvor.tipo && <div className={styles.infoItem}><span className={styles.infoLabel}>Tipo</span><span className="badge badge-purple">{louvor.tipo}</span></div>}
                </div>
                {louvor.tags?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <span className={styles.infoLabel}>Tags</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {louvor.tags.map(t => <span key={t} className="badge badge-dim">{t}</span>)}
                    </div>
                  </div>
                )}
                {louvor.cifra_url && (
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => window.open(louvor.cifra_url, '_blank')}>
                      🎸 Ver cifra ↗
                    </button>
                  </div>
                )}
              </div>
            )}

            <hr className="divider" />
            <TonsVocalista louvorId={louvorId} isAdmin={isAdmin} />
          </div>
        )}

        {aba === 'letra' && (
          <LetraViewer
            letra={louvor.letra}
            youtubeUrl={louvor.youtube_url}
            isAdmin={isAdmin}
            onAtualizarLetra={handleAtualizarLetra}
            onFecharApresentacao={() => setAba('letra')}
          />
        )}

        {aba === 'cifra' && (
          <div className={styles.cifraTab} style={{ paddingBottom: 72 }}>
            {/* Sub-abas */}
            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 0, padding: '0 20px' }}>
              {[
                { id: 'visualizar', label: '🎸 Visualizar' },
                { id: 'editar',     label: '✏️ Editar' },
                { id: 'fonte',      label: '🔗 Fonte' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={`${styles.aba} ${cifraSubAba === id ? styles.abaAtiva : ''}`}
                  style={{ fontSize: 12 }}
                  onClick={() => setCifraSubAba(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sub-aba Visualizar */}
            {cifraSubAba === 'visualizar' && (
              cifraTextoLocal
                ? <CifraViewer
                    cifraTexto={cifraTextoLocal}
                    tomOriginal={tomResolvido}
                    titulo={louvor.titulo}
                    artista={louvor.artista}
                  />
                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 12, color: 'var(--muted)' }}>
                    <span>Nenhuma cifra cadastrada.</span>
                    {isAdmin && (
                      <button className="btn btn-primary" onClick={() => setCifraSubAba('editar')}>
                        + Adicionar Cifra
                      </button>
                    )}
                  </div>
            )}

            {/* Sub-aba Editar */}
            {cifraSubAba === 'editar' && (
              <div style={{ padding: '20px 20px 0' }}>
                <CifraEditor
                  louvorId={louvorId}
                  cifraTexto={cifraTextoLocal || ''}
                  onSalvo={(novoTexto) => {
                    setCifraTextoLocal(novoTexto);
                    setCifraSubAba('visualizar');
                  }}
                  onCancelar={() => setCifraSubAba('visualizar')}
                />
              </div>
            )}

            {/* Sub-aba Fonte */}
            {cifraSubAba === 'fonte' && (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  Cole o link de referência. Para usar no sistema, copie os acordes e cole na aba Editar.
                </p>

                {editandoCifraUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      className="input"
                      value={cifraUrlInput}
                      onChange={e => setCifraUrlInput(e.target.value)}
                      placeholder="https://www.cifraclub.com.br/..."
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={salvandoCifraUrl}
                        onClick={async () => {
                          setSalvandoCifraUrl(true);
                          try {
                            await louvoresApi.atualizarCifra(louvorId, { cifra_url: cifraUrlInput });
                            setCifraUrlLocal(cifraUrlInput);
                            setEditandoCifraUrl(false);
                          } catch (err) {
                            alert(err.message);
                          } finally {
                            setSalvandoCifraUrl(false);
                          }
                        }}
                      >
                        {salvandoCifraUrl ? <span className="spinner" /> : 'Salvar'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditandoCifraUrl(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ flex: 1, fontSize: 13, color: cifraUrlLocal ? 'var(--text)' : 'var(--muted)', wordBreak: 'break-all' }}>
                        {cifraUrlLocal || 'Nenhum link cadastrado'}
                      </span>
                      {isAdmin && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setCifraUrlInput(cifraUrlLocal || ''); setEditandoCifraUrl(true); }}
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                    {cifraUrlLocal && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={() => window.open(cifraUrlLocal, '_blank')}
                      >
                        Abrir no Cifraclub ↗
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Barra fixa mobile */}
            <div className={styles.cifraFooterBar}>
              <button
                className={`${styles.cifraFooterBtn} ${cifraSubAba === 'visualizar' ? styles.cifraFooterBtnAtivo : ''}`}
                onClick={() => setCifraSubAba('visualizar')}
              >
                🎸 Cifra
              </button>
              {isAdmin && (
                <button
                  className={`${styles.cifraFooterBtn} ${cifraSubAba === 'editar' ? styles.cifraFooterBtnAtivo : ''}`}
                  onClick={() => setCifraSubAba('editar')}
                >
                  ✏️ Editar
                </button>
              )}
            </div>
          </div>
        )}

        {aba === 'youtube' && (
          <YoutubePlayer url={louvor.youtube_url} onAtualizar={handleAtualizarYoutube} isAdmin={isAdmin} />
        )}

        {aba === 'historico' && (
          <div>
            {carregandoHistorico ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" style={{ width: 28, height: 28 }} />
              </div>
            ) : !historicoData ? null : (
              <>
                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>{historicoData.total_usos}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Total de usos</div>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: historicoData.dias_desde_ultimo_uso > 60 ? 'var(--orange)' : 'var(--text)' }}>
                      {historicoData.dias_desde_ultimo_uso != null ? historicoData.dias_desde_ultimo_uso : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Dias desde o último uso</div>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      {historicoData.tom_mais_usado
                        ? <span className="badge badge-gold" style={{ fontSize: 16 }}>{historicoData.tom_mais_usado}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Tom mais usado</div>
                  </div>
                </div>

                {/* Alerta de inatividade */}
                {historicoData.dias_desde_ultimo_uso > 60 && (
                  <div style={{ background: 'rgba(244,144,12,0.12)', border: '1px solid var(--orange)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--orange)' }}>
                    ⚠️ Essa música não é tocada há {historicoData.dias_desde_ultimo_uso} dias.
                  </div>
                )}

                {/* Lista de cultos */}
                {historicoData.historico.length === 0 ? (
                  <p style={{ color: 'var(--dim)', fontSize: 13 }}>Ainda não foi usada em nenhum culto.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {historicoData.historico.map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{h.culto_nome}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(h.data_culto).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                        {h.tom_usado && <span className="badge badge-blue">{h.tom_usado}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
