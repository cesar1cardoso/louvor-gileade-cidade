import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cultos as cultosApi, membros, louvores } from '../../services/api';
import { Avatar } from '../../components/Layout';
import styles from './Dashboard.module.css';

function StatCard({ icon, label, valor, cor }) {
  return (
    <div className={styles.statCard} style={{ borderColor: `${cor}33` }}>
      <div className={styles.statIcon} style={{ color: cor }}>{icon}</div>
      <div className={styles.statValor} style={{ color: cor }}>{valor}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState({ cultosLista: [], membrosLista: [], louvoresLista: [], proximos: [] });
  const [carregando, setCarregando] = useState(true);
  const [cultoProximo, setCultoProximo] = useState(null);
  const [cardAberto, setCardAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [repertorioCulto, setRepertorioCulto] = useState([]);
  const [escalaCulto, setEscalaCulto] = useState([]);
  const [carregandoDet, setCarregandoDet] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [c, m, l, p] = await Promise.all([
          cultosApi.listar(),
          membros.listar(),
          louvores.listar(),
          cultosApi.proximos(),
        ]);
        setDados({ cultosLista: c, membrosLista: m, louvoresLista: l, proximos: p });
        if (p?.length > 0) setCultoProximo(p[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  const carregarDetalheCulto = async (cultoId) => {
    setCarregandoDet(true);
    try {
      const detalhe = await cultosApi.buscar(cultoId);
      setEscalaCulto(detalhe.escala || []);
      const musicas = (detalhe.repertorio || [])
        .filter(i => i.tipo === 'musica' && i.louvor_id)
        .sort((a, b) => a.posicao - b.posicao);
      setRepertorioCulto(musicas);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoDet(false);
    }
  };

  const handleExpandir = async () => {
    const novoEstado = !cardAberto;
    setCardAberto(novoEstado);

    if (novoEstado && repertorioCulto.length === 0 && cultoProximo) {
      carregarDetalheCulto(cultoProximo.id);
    }
  };

  const handleSelecionarCulto = (culto) => {
    setDropdownAberto(false);
    if (culto.id === cultoProximo?.id) return;
    setCultoProximo(culto);
    setRepertorioCulto([]);
    setEscalaCulto([]);
    if (cardAberto) {
      carregarDetalheCulto(culto.id);
    }
  };

  const proximoCulto = cultoProximo || dados.proximos[0];
  const confirmados = parseInt(proximoCulto?.confirmados) || 0;
  const totalEscala = parseInt(proximoCulto?.total_escala) || 0;

  const formatarHora = (dt) => {
    if (!dt) return '';
    const m = String(dt).match(/[T ](\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarDataCurta = (dt) => {
    if (!dt) return '';
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return new Date(dt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const [, ano, mes, dia] = m;
    return new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  };

  if (carregando) {
    return <div className={styles.loading}><div className="spinner" style={{ width: 36, height: 36 }} /></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.saudacao}>
        <h1>Olá, {usuario?.nome?.split(' ')[0]} 👋</h1>
        <p className={styles.subSaudacao}>Bem-vindo ao sistema de gerenciamento do louvor</p>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon="🎸" label="Membros ativos" valor={dados.membrosLista.length} cor="var(--green)" />
        <StatCard icon="🎵" label="Louvores" valor={dados.louvoresLista.length} cor="var(--gold)" />
        <StatCard icon={<img src="/logo-casaviva.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 5, verticalAlign: 'middle' }} />} label="Cultos" valor={dados.cultosLista.length} cor="var(--blue)" />
        <StatCard icon="✅" label="Confirmados" valor={`${confirmados}/${totalEscala}`} cor="var(--orange)" />
      </div>

      {proximoCulto && (
        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 16,
        }}>

          {/* ── Trigger — clicável para expandir ── */}
          <div
            onClick={handleExpandir}
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 6 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dados.proximos.length > 1) setDropdownAberto(v => !v);
                  }}
                  style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 99,
                    background: 'rgba(39,176,96,0.12)',
                    color: 'var(--green)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    border: 'none',
                    cursor: dados.proximos.length > 1 ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                  }}
                >
                  Próximo culto
                  {dados.proximos.length > 1 && <span style={{ fontSize: 9 }}>▾</span>}
                </button>

                {dropdownAberto && (
                  <>
                    <div
                      onClick={(e) => { e.stopPropagation(); setDropdownAberto(false); }}
                      style={{ position: 'fixed', inset: 0, zIndex: 19 }}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 4,
                      background: 'var(--surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 10,
                      width: 260,
                      overflow: 'hidden',
                      zIndex: 20,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    }}>
                      {dados.proximos.map(c => (
                        <div
                          key={c.id}
                          onClick={(e) => { e.stopPropagation(); handleSelecionarCulto(c); }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            background: c.id === cultoProximo?.id ? 'rgba(39,176,96,0.08)' : 'transparent',
                            borderBottom: '0.5px solid var(--border)',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                            {c.nome}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                            {formatarDataCurta(c.data_hora)} · {parseInt(c.confirmados) || 0}/{parseInt(c.total_escala) || 0} confirmados
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 600,
                color: 'var(--text)',
                lineHeight: 1.3,
                marginBottom: 3,
              }}>
                {proximoCulto.nome}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                {formatarDataCurta(proximoCulto.data_hora)}
                {' · '}
                {formatarHora(proximoCulto.data_hora)}
                {proximoCulto.local && ` · ${proximoCulto.local}`}
              </div>
            </div>

            {/* Ícone de expandir */}
            <div style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: 'var(--card)',
              border: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'var(--dim)',
              flexShrink: 0, marginTop: 2,
              transform: cardAberto ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
            }}>
              ▼
            </div>
          </div>

          {/* ── Conteúdo expansível ── */}
          <div style={{
            maxHeight: cardAberto ? '1400px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease',
          }}>

            {/* Escala */}
            <div style={{ borderTop: '0.5px solid var(--border)' }}>
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: 'var(--dim)',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '12px 16px 6px',
              }}>
                Escala
              </div>

              {/* Barra de progresso */}
              <div style={{ padding: '0 16px 10px' }}>
                <div style={{
                  height: 5, background: 'var(--border)',
                  borderRadius: 3, overflow: 'hidden', marginBottom: 5,
                }}>
                  <div style={{
                    height: '100%',
                    width: totalEscala > 0
                      ? `${Math.round((confirmados / totalEscala) * 100)}%`
                      : '0%',
                    background: 'var(--green)',
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                  {confirmados} de {totalEscala} confirmados
                </div>
              </div>

              {/* Membros da escala */}
              {carregandoDet ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                </div>
              ) : escalaCulto.length === 0 ? (
                <div style={{ padding: '8px 16px 12px', fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>
                  Nenhum membro escalado ainda.
                </div>
              ) : (
                escalaCulto.map((e, i) => {
                  const cores = [
                    ['rgba(46,190,160,0.12)','#085041'],
                    ['rgba(72,120,200,0.12)','#0C447C'],
                    ['rgba(212,83,126,0.12)','#72243E'],
                    ['rgba(186,117,23,0.12)','#633806'],
                    ['rgba(128,72,200,0.12)','#3C3489'],
                    ['rgba(220,100,60,0.12)','#712B13'],
                  ];
                  const [bg, color] = cores[i % cores.length];
                  const ini = (e.membro_nome || e.visitante_nome || '?').slice(0,2).toUpperCase();
                  const instr = [e.instrumento_nome, e.is_vocal ? 'Vocal' : null].filter(Boolean).join(' · ');

                  return (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 16px',
                      borderBottom: i < escalaCulto.length - 1 ? '0.5px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: bg, color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {ini}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                          {e.membro_nome || e.visitante_nome}
                        </div>
                        {instr && (
                          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>
                            {instr}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: e.confirmado ? 'var(--green)' : 'var(--border)',
                        outline: e.confirmado ? '2px solid rgba(39,176,96,0.3)' : 'none',
                        outlineOffset: 1,
                      }} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Repertório */}
            <div style={{ borderTop: '0.5px solid var(--border)' }}>
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: 'var(--dim)',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '12px 16px 6px',
              }}>
                Repertório
              </div>

              {!carregandoDet && repertorioCulto.length === 0 && (
                <div style={{ padding: '8px 16px 12px', fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>
                  Nenhum repertório montado ainda.
                </div>
              )}

              {repertorioCulto.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => navigate('/repertorio', { state: { palco: true, cultoId: proximoCulto.id, palcoLouvorId: item.louvor_id } })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px',
                    borderBottom: i < repertorioCulto.length - 1
                      ? '0.5px solid var(--border)'
                      : 'none',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onTouchStart={e => e.currentTarget.style.background = 'var(--card)'}
                  onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--card)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 7,
                    background: 'var(--card)',
                    border: '0.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'var(--dim)', fontWeight: 500, flexShrink: 0,
                  }}>
                    {item.posicao}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {item.titulo}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>
                      {item.artista}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {(item.tom_culto || item.tom) && (
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 6,
                        background: 'rgba(201,168,76,0.12)',
                        color: 'var(--gold)',
                        border: '0.5px solid rgba(201,168,76,0.2)',
                      }}>
                        {item.tom_culto || item.tom}
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--dim)' }}>›</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Botão Palco */}
            {repertorioCulto.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)' }}>
                <button
                  onClick={() => navigate('/repertorio', {
                    state: { palco: true, cultoId: proximoCulto.id }
                  })}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--gold)',
                    color: '#0a0806',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.1px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onTouchStart={e => e.currentTarget.style.opacity = '0.88'}
                  onTouchEnd={e => e.currentTarget.style.opacity = '1'}
                >
                  🎭 Entrar no Palco
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!proximoCulto && (
        <div className={styles.semCulto}>
          <div className={styles.semCultoIcon}>🗓️</div>
          <p>Nenhum culto agendado. <button className={styles.linkBtn} onClick={() => navigate('/cultos')}>Criar culto</button></p>
        </div>
      )}

      <div className={styles.acessoRapido}>
        <h3 className={styles.sectionTitle}>Acesso rápido</h3>
        <div className={styles.acessoGrid}>
          {[
            { icon: <img src="/logo-casaviva.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 5, verticalAlign: 'middle' }} />, label: 'Novo culto', path: '/cultos' },
            { icon: '🎵', label: 'Adicionar louvor', path: '/louvores' },
            { icon: '📋', label: 'Montar repertório', path: '/repertorio' },
            { icon: '👥', label: 'Gerenciar membros', path: '/membros' },
          ].map(item => (
            <button key={item.path} className={styles.acessoBtn} onClick={() => navigate(item.path)}>
              <span className={styles.acessoIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
