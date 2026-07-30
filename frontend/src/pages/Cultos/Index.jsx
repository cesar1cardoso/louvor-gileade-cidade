import { useState, useEffect } from 'react';
import { cultos as cultosApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import styles from './Cultos.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDatetime(dt) {
  if (!dt) return '';
  const match = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    const [, ano, mes, dia, hora, min] = match;
    return `${ano}-${mes}-${dia}T${hora}:${min}`;
  }
  const d = new Date(dt);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const CORES_AVATAR = ['#c9a84c','#28a888','#4878c8','#8048c8','#f4900c','#d05050'];
function corAvatar(nome) {
  return CORES_AVATAR[(nome?.charCodeAt(0) || 0) % CORES_AVATAR.length];
}
function iniciaisAvatar(nome) {
  if (!nome) return '?';
  return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

function BottomSheetDetalhes({ culto, onFechar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const formatarData = (dt) => {
    if (!dt) return '';
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };
  const formatarHora = (dt) => {
    const m = String(dt || '').match(/[T ](\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '';
  };

  useEffect(() => {
    cultosApi.buscar(culto.id)
      .then(data => setDados(data))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [culto.id]);

  const escala = dados?.escala || [];
  const musicas = (dados?.repertorio || [])
    .filter(i => i.tipo === 'musica' && i.louvor_id)
    .sort((a, b) => a.posicao - b.posicao);

  return (
    <>
      <div className={styles.sheetOverlay} onClick={onFechar} />
      <div className={styles.bottomSheet}>

        {/* Handle */}
        <div className={styles.sheetHandleWrap}>
          <div className={styles.sheetHandle} />
        </div>

        {/* Cabeçalho */}
        <div className={styles.sheetHeader}>
          <div className={styles.sheetHeaderInfo}>
            <div className={styles.sheetTitulo}>{culto.nome}</div>
            <div className={styles.sheetMeta}>
              <i className="ti ti-clock" style={{ fontSize: 12 }} />
              {formatarData(culto.data_hora)} · {formatarHora(culto.data_hora)}
              {culto.local && <> · <i className="ti ti-map-pin" style={{ fontSize: 12 }} /> {culto.local}</>}
            </div>
          </div>
          <button className={styles.sheetClose} onClick={onFechar}>
            <i className="ti ti-x" />
          </button>
        </div>

        {carregando ? (
          <div className={styles.sheetLoading}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className={styles.sheetContent}>

            {/* Escala */}
            <div className={styles.sheetSection}>
              <div className={styles.sheetSectionTitle}>
                <i className="ti ti-users" />
                ESCALA
              </div>
              {escala.length === 0 ? (
                <p className={styles.sheetVazio}>Nenhum membro escalado.</p>
              ) : escala.map((e, i) => {
                const nome = e.membro_nome || e.convidado_nome || e.visitante_nome || 'Convidado';
                const instr = e.instrumento_override || e.instrumento_nome || e.convidado_instrumento || '';
                const isVocal = e.is_vocal || e.convidado_vocal;
                const funcao = [instr, isVocal ? 'Vocal' : ''].filter(Boolean).join(' · ');
                return (
                  <div key={i} className={styles.sheetMembro}>
                    <div className={styles.membroAvatar} style={{ background: corAvatar(nome) }}>
                      {iniciaisAvatar(nome)}
                    </div>
                    <div className={styles.membroInfo}>
                      <div className={styles.membroNome}>{nome}</div>
                      {funcao && <div className={styles.membroRole}>{funcao}</div>}
                    </div>
                    <div className={`${styles.confirmaDot} ${e.confirmado ? styles.confirmaDotSim : ''}`}
                      title={e.confirmado ? 'Confirmado' : 'Pendente'} />
                  </div>
                );
              })}
            </div>

            {/* Repertório */}
            <div className={styles.sheetSection}>
              <div className={styles.sheetSectionTitle}>
                <i className="ti ti-music" />
                REPERTÓRIO
              </div>
              {musicas.length === 0 ? (
                <p className={styles.sheetVazio}>Nenhuma música no repertório.</p>
              ) : musicas.map((item, i) => (
                <div key={item.id} className={styles.sheetMusica}>
                  <div className={styles.musicaPos}>{item.posicao ?? i + 1}</div>
                  <div className={styles.musicaInfo}>
                    <div className={styles.musicaTitulo}>{item.titulo}</div>
                    <div className={styles.musicaArtista}>{item.artista}</div>
                  </div>
                  {(item.tom_culto || item.tom) && (
                    <div className={styles.musicaTom}>{item.tom_culto || item.tom}</div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </>
  );
}

// ── Modal criar/editar culto ──────────────────────────────────────────────────

function ModalCulto({ culto, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: culto?.nome || '',
    data_hora: culto?.data_hora ? toLocalDatetime(culto.data_hora) : '',
    local: culto?.local || '',
    descricao: culto?.descricao || '',
    observacoes: culto?.observacoes || '',
    status: culto?.status || 'agendado',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try { await onSalvar(form); onFechar(); }
    catch (err) { setErro(err.message); }
    finally { setSalvando(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <h2 className="modal-title">{culto ? 'Editar culto' : 'Novo culto'}</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="input" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data e hora *</label>
              <input type="datetime-local" className="input" value={form.data_hora} onChange={e => setForm(f => ({...f, data_hora: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Local</label>
              <input className="input" value={form.local} onChange={e => setForm(f => ({...f, local: e.target.value}))} placeholder="Salão principal..." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="input" value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações internas</label>
            <textarea className="input" rows={3} value={form.observacoes}
              onChange={e => setForm(f => ({...f, observacoes: e.target.value}))}
              placeholder="Ex: haverá batismo, confirmar som antes..." style={{ resize: 'vertical' }} />
          </div>
          {culto && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                <option value="agendado">Agendado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          )}
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

// ── Página principal ──────────────────────────────────────────────────────────

export default function Cultos() {
  const { isAdmin, isLiderOuAdmin } = useAuth();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [cultoEditando, setCultoEditando] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(null);
  const [sheetCulto, setSheetCulto] = useState(null);

  const carregar = () => {
    cultosApi.listar().then(setLista).catch(console.error).finally(() => setCarregando(false));
  };
  useEffect(carregar, []);

  const handleSalvar = async (form) => {
    if (cultoEditando) await cultosApi.atualizar(cultoEditando.id, form);
    else await cultosApi.criar(form);
    carregar();
  };

  const handleExcluir = async (culto) => {
    if (!confirm(`Excluir "${culto.nome}"? Esta ação não pode ser desfeita.`)) return;
    try { await cultosApi.deletar(culto.id); carregar(); }
    catch (err) { alert(err.message); }
  };

  const handleRealizar = async (culto) => {
    if (!confirm(`Marcar "${culto.nome}" como realizado?`)) return;
    try { await cultosApi.realizar(culto.id); carregar(); }
    catch (err) { alert(err.message); }
  };

  const handleLinkVisitante = async (culto) => {
    try {
      const data = await cultosApi.linkVisitante(culto.id);
      await navigator.clipboard.writeText(data.url);
      setLinkCopiado(culto.id);
      setTimeout(() => setLinkCopiado(null), 3000);
    } catch (err) { alert('Erro ao gerar link: ' + err.message); }
  };

  const formatarData = (dt) => {
    if (!dt) return '';
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const [, ano, mes, dia] = m;
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
      .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };
  const formatarHora = (dt) => {
    const m = String(dt || '').match(/[T ](\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '';
  };

  const agora = new Date();
  const pctConfirmados = (culto) =>
    culto.total_escala > 0 ? Math.round((culto.confirmados / culto.total_escala) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.titulo}>Cultos</h1>
          <p className={styles.subtitulo}>{lista.length} cultos cadastrados</p>
        </div>
        {isLiderOuAdmin && (
          <button className="btn btn-primary" onClick={() => { setCultoEditando(null); setModalAberto(true); }}>
            + Novo culto
          </button>
        )}
      </div>

      {carregando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : lista.length === 0 ? (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>🗓️</div>
          <p>Nenhum culto cadastrado ainda.</p>
          {isLiderOuAdmin && (
            <button className="btn btn-primary" onClick={() => setModalAberto(true)}>Criar primeiro culto</button>
          )}
        </div>
      ) : (
        <div className={styles.lista}>
          {lista.map(culto => {
            const dataHora = new Date(culto.data_hora);
            const isProximo = dataHora > agora && culto.status === 'agendado';
            const isAgendado = culto.status === 'agendado';
            const dia = dataHora.getDate().toString().padStart(2, '0');
            const mes = dataHora.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
            const pct = pctConfirmados(culto);

            return (
              <div key={culto.id} className={`${styles.cultoCard} ${isProximo ? styles.cultoProximo : ''} ${culto.status === 'realizado' ? styles.cultoRealizado : ''}`}>
                {isProximo && <div className={styles.cultoAccent} />}

                <div className={styles.cultoInner}>
                  <div className={styles.cultoTop}>
                    <div className={styles.cultoDate}>
                      <span className={styles.dataDia}>{dia}</span>
                      <span className={`${styles.dataMes} ${isProximo ? styles.dataMesProximo : ''}`}>{mes}</span>
                    </div>

                    <div className={styles.cultoDivider} />

                    <div className={styles.cultoBody}>
                      <div className={styles.cultoHeaderRow}>
                        <h3 className={styles.cultoNome}>{culto.nome}</h3>
                        <span className={`${styles.statusBadge} ${
                          isProximo ? styles.badgeProximo :
                          culto.status === 'realizado' ? styles.badgeRealizado :
                          culto.status === 'cancelado' ? styles.badgeCancelado :
                          styles.badgeAgendado
                        }`}>
                          {isProximo ? 'Próximo' : culto.status === 'agendado' ? 'Agendado' : culto.status === 'realizado' ? 'Realizado' : 'Cancelado'}
                        </span>
                      </div>

                      <div className={styles.cultoMeta}>
                        <div className={styles.metaRow}>
                          <i className="ti ti-clock" aria-hidden="true" />
                          <span>{formatarData(culto.data_hora)} · {formatarHora(culto.data_hora)}</span>
                        </div>
                        {culto.local && (
                          <div className={styles.metaRow}>
                            <i className="ti ti-map-pin" aria-hidden="true" />
                            <span>{culto.local}</span>
                          </div>
                        )}
                      </div>

                      {culto.descricao && <p className={styles.cultoDesc}>{culto.descricao}</p>}
                      {culto.observacoes && (
                        <div className={styles.observacoes}>
                          <i className="ti ti-pin" aria-hidden="true" />
                          <span>{culto.observacoes}</span>
                        </div>
                      )}

                      <div className={styles.progressWrap}>
                        <div className={styles.progressLabel}>
                          <span className={styles.progressTxt}>Confirmados</span>
                          <span className={styles.progressNum}>{culto.confirmados} / {culto.total_escala}</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de ação (lider/admin) */}
                  {isLiderOuAdmin && (
                    <div className={styles.cultoAcoes}>
                      <button className={`${styles.abt} ${styles.abtEdit}`} onClick={() => { setCultoEditando(culto); setModalAberto(true); }} title="Editar">
                        <i className="ti ti-pencil" aria-hidden="true" />
                      </button>
                      {culto.status === 'agendado' && (
                        <button className={`${styles.abt} ${styles.abtCheck}`} onClick={() => handleRealizar(culto)} title="Marcar como realizado">
                          <i className="ti ti-circle-check" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        className={`${styles.abt} ${linkCopiado === culto.id ? styles.abtCheckCopied : styles.abtLink}`}
                        onClick={() => handleLinkVisitante(culto)}
                        title="Gerar link para visitante"
                      >
                        <i className={`ti ${linkCopiado === culto.id ? 'ti-check' : 'ti-link'}`} aria-hidden="true" />
                      </button>
                      {isAdmin && (
                        <button className={`${styles.abt} ${styles.abtDel}`} onClick={() => handleExcluir(culto)} title="Excluir">
                          <i className="ti ti-trash" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Botão Detalhes — só em cultos AGENDADOS, só em mobile/tablet */}
                  {isAgendado && (
                    <div className={styles.detalhesFooter}>
                      <button
                        className={`${styles.detalhesBtn} ${isProximo ? styles.detalhesBtnProximo : styles.detalhesBtnAgendado}`}
                        onClick={() => setSheetCulto(culto)}
                      >
                        <span className={styles.detalhesBtnIcon}>
                          <i className="ti ti-calendar-event" aria-hidden="true" />
                        </span>
                        <span className={styles.detalhesBtnLabel}>Ver escala e repertório</span>
                        <i className="ti ti-chevron-right" aria-hidden="true" style={{ opacity: 0.6 }} />
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <ModalCulto
          culto={cultoEditando}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setCultoEditando(null); }}
        />
      )}

      {sheetCulto && (
        <BottomSheetDetalhes
          culto={sheetCulto}
          onFechar={() => setSheetCulto(null)}
        />
      )}
    </div>
  );
}
