import { useState, useEffect } from 'react';
import { estatisticas as estatisticasApi } from '../../services/api';
import styles from './Estatisticas.module.css';

function PosicaoCirculo({ pos }) {
  const cls = pos === 1 ? styles.pos1 : pos === 2 ? styles.pos2 : pos === 3 ? styles.pos3 : styles.posN;
  return <div className={`${styles.rankingPos} ${cls}`}>{pos}º</div>;
}

export default function Estatisticas() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    estatisticasApi.louvores()
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className={styles.spinner}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!dados) {
    return <div className={styles.vazio}>Erro ao carregar estatísticas.</div>;
  }

  const maxUsos = dados.ranking.length > 0 ? dados.ranking[0].total_usos : 1;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.titulo}>Estatísticas</h1>
        <p className={styles.subtitulo}>Visão geral do uso de louvores</p>
      </div>

      {/* Seção 1 — Mais tocadas */}
      <div className={styles.secao}>
        <div className={styles.secaoTitulo}>🏆 Mais tocadas</div>
        {dados.ranking.length === 0 ? (
          <div className={styles.vazio}>Nenhum louvor foi usado em cultos ainda.</div>
        ) : (
          <div className={styles.rankingLista}>
            {dados.ranking.map((item, idx) => (
              <div key={item.louvor_id} className={styles.rankingItem}>
                <PosicaoCirculo pos={idx + 1} />
                <div className={styles.rankingInfo}>
                  <div className={styles.rankingTitulo}>{item.titulo}</div>
                  {item.artista && <div className={styles.rankingArtista}>{item.artista}</div>}
                </div>
                <div className={styles.rankingBarra}>
                  <div
                    className={styles.rankingBarraFill}
                    style={{ width: `${Math.round((item.total_usos / Math.max(maxUsos, 1)) * 100)}%` }}
                  />
                </div>
                <div className={styles.rankingUsos}>{item.total_usos}x</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção 2 — Esquecidas */}
      <div className={styles.secao}>
        <div className={styles.secaoTitulo}>💤 Esquecidas</div>
        {dados.esquecidos.length === 0 ? (
          <div className={styles.vazio}>Todas as músicas foram usadas nos últimos 60 dias.</div>
        ) : (
          <div className={styles.esquecidosLista}>
            {dados.esquecidos.map(item => {
              const dias = item.dias_sem_usar;
              const badgeClass = dias == null ? 'badge-dim' : dias >= 90 ? 'badge-red' : 'badge-orange';
              const label = dias == null ? 'Nunca usada' : `${dias} dias sem tocar`;
              return (
                <div key={item.id} className={styles.esquecidoItem}>
                  <div className={styles.esquecidoInfo}>
                    <div className={styles.esquecidoTitulo}>{item.titulo}</div>
                    {item.artista && <div className={styles.esquecidoArtista}>{item.artista}</div>}
                  </div>
                  <span className={`badge ${badgeClass}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção 3 — Linha do tempo */}
      <div className={styles.secao}>
        <div className={styles.secaoTitulo}>📅 Linha do tempo</div>
        {dados.timeline.length === 0 ? (
          <div className={styles.vazio}>Nenhum culto realizado ainda.</div>
        ) : (
          <div className={styles.timelineLista}>
            {dados.timeline.map(culto => {
              const louvores = culto.louvores || [];
              const visiveis = louvores.slice(0, 3);
              const extras = louvores.length - 3;
              return (
                <div key={culto.id} className={styles.timelineItem}>
                  <div className={styles.timelineCabecalho}>
                    <div className={styles.timelineNome}>{culto.nome}</div>
                    <div className={styles.timelineData}>
                      {new Date(culto.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {louvores.length > 0 ? (
                    <div className={styles.timelineTags}>
                      {visiveis.map((l, i) => (
                        <span key={i} className="badge badge-dim">{l.titulo}</span>
                      ))}
                      {extras > 0 && (
                        <span className="badge badge-blue">+{extras}</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sem músicas no repertório</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
