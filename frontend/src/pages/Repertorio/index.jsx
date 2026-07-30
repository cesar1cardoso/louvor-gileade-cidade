import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { repertorios as repertoriosApi, louvores as louvoresApi, escalas as escalasApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/Layout';
import { useCultoProximo, mesLabel, mesChave } from '../../hooks/useCultoProximo';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Repertorio.module.css';
import CifraViewer from '../Louvores/components/CifraViewer';
import PalcoMode from './PalcoMode';
import EstudarMode from './EstudarMode';

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_ITEM_LABELS = {
  musica:    '🎵 Música',
  oracao:    '🙏 Oração',
  palavra:   '📖 Palavra',
  ofertorio: '💛 Ofertório',
  comunhao:  '🍷 Comunhão',
  aviso:     '📢 Aviso',
  outro:     '📌 Outro',
};
const TIPOS_NAO_MUSICAIS = ['oracao', 'palavra', 'ofertorio', 'comunhao', 'aviso', 'outro'];
const CATEGORIAS = ['Adoração', 'Louvor', 'Comunhão'];

// ─── Transposição ─────────────────────────────────────────────────────────────

const TONS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function calcularTransposicao(tomOriginal, tomVocalista) {
  const normalizar = t => t?.replace('m','').replace('b','#') || '';
  const idxOriginal  = TONS.indexOf(normalizar(tomOriginal));
  const idxVocalista = TONS.indexOf(normalizar(tomVocalista));
  if (idxOriginal === -1 || idxVocalista === -1) return 0;
  return (idxVocalista - idxOriginal + 12) % 12;
}

// ─── ModalVisualizacaoLouvor ──────────────────────────────────────────────────

const SECAO_CORES_MODAL = {
  '[Verso':      'var(--blue)',
  '[Refrão':     'var(--gold)',
  '[Pré-Refrão': 'var(--orange)',
  '[Ponte':      'var(--purple)',
  '[Coro':       'var(--gold)',
  '[Intro':      'var(--green)',
  '[Outro':      'var(--dim)',
};

function getCorSecaoModal(linha) {
  for (const [key, cor] of Object.entries(SECAO_CORES_MODAL)) {
    if (linha.startsWith(key)) return cor;
  }
  return 'var(--muted)';
}

function getYoutubeIdModal(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function ModalVisualizacaoLouvor({ louvorId, titulo, artista, tomBase, tomVocalista, onFechar }) {
  const [aba, setAba] = useState('letra');
  const [louvor, setLouvor] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    louvoresApi.buscar(louvorId)
      .then(setLouvor)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [louvorId]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div
        className="modal fade-in"
        style={{ maxWidth: 600, width: '90vw', display: 'flex', flexDirection: 'column', maxHeight: '85vh', padding: 0 }}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h2 className="modal-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {titulo}
            </h2>
            {artista && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{artista}</div>}
          </div>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { id: 'letra',   label: '📝 Letra'   },
            { id: 'cifra',   label: '🎸 Cifra'   },
            { id: 'youtube', label: '▶ YouTube'  },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${aba === id ? 'var(--gold)' : 'transparent'}`,
                padding: '10px 8px',
                fontSize: 13,
                fontWeight: 500,
                color: aba === id ? 'var(--gold)' : 'var(--muted)',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {carregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : aba === 'letra' ? (
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              {louvor?.letra ? (
                louvor.letra.split('\n').map((linha, i) => {
                  const isSecao = linha.startsWith('[') && linha.includes(']');
                  if (linha.trim() === '') return <div key={i} style={{ height: 10 }} />;
                  if (isSecao) return (
                    <div key={i} style={{ fontWeight: 700, color: getCorSecaoModal(linha), fontSize: 12, marginTop: 14, marginBottom: 2 }}>
                      {linha}
                    </div>
                  );
                  return <div key={i} style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{linha}</div>;
                })
              ) : (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Nenhuma letra cadastrada.</p>
              )}
            </div>
          ) : aba === 'cifra' ? (
            louvor?.cifra_texto ? (
              <div style={{ margin: '-16px' }}>
                <CifraViewer
                  cifraTexto={louvor.cifra_texto}
                  tomOriginal={tomBase || louvor.tom || 'G'}
                  titulo={titulo}
                  artista={artista}
                />
              </div>
            ) : louvor?.cifra_url ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, gap: 12 }}>
                {tomVocalista && tomBase && tomVocalista !== tomBase && (
                  <div style={{
                    width: '100%',
                    background: 'rgba(217,119,6,0.12)',
                    border: '1px solid rgba(217,119,6,0.4)',
                    borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
                  }}>
                    <div>🎵 <strong>Tom do vocalista:</strong> <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{tomVocalista}</span></div>
                    <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                      O Cifra Club abrirá no tom original (<strong>{tomBase}</strong>).
                      No site, use o seletor de tom e escolha <strong>{tomVocalista}</strong>.
                    </div>
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => window.open(louvor.cifra_url, '_blank')}
                >
                  Abrir cifra no Cifra Club ↗
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
                Nenhuma cifra cadastrada para este louvor.
              </p>
            )
          ) : (
            louvor?.youtube_url ? (
              (() => {
                const videoId = getYoutubeIdModal(louvor.youtube_url);
                return videoId ? (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8 }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    />
                  </div>
                ) : (
                  <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>URL de vídeo inválida.</p>
                );
              })()
            ) : (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Nenhum vídeo cadastrado.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SortableItem ─────────────────────────────────────────────────────────────

function SortableItem({ item, isAdmin, onRemover, tonsVocalistas, onVerLouvor, onMarcarPrincipal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const isClickable = item.tipo === 'musica' && item.louvor_id && onVerLouvor;

  // Resolve o tom: vocal principal marcado > único vocalista com tom salvo > tom do culto
  const principalMarcado = tonsVocalistas?.find(t => t.membro_id === item.vocal_principal_id);
  const tomResolvido = principalMarcado?.tom
    || (tonsVocalistas?.length === 1 ? tonsVocalistas[0].tom : null)
    || item.tom_culto || null;

  const handleBodyClick = () => {
    if (!isDragging && isClickable) {
      onVerLouvor({
        louvorId:    item.louvor_id,
        titulo:      item.titulo,
        artista:     item.artista,
        tomBase:      item.tom_padrao || null,
        tomVocalista: tomResolvido,
      });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`${styles.item} ${isDragging ? styles.itemDragging : ''}`}>
      {isAdmin && (
        <div className={styles.itemDrag} {...attributes} {...listeners}>⠿</div>
      )}
      <div className={styles.itemNum}>{item.posicao}</div>
      <div
        className={styles.itemBody}
        onClick={handleBodyClick}
        style={isClickable ? { cursor: 'pointer' } : undefined}
      >
        <div className={styles.itemHeader}>
          {item.tipo !== 'musica' && (
            <span className={styles.itemTipoLabel}>{TIPO_ITEM_LABELS[item.tipo]}</span>
          )}
          <span className={styles.itemTitulo}>
            {item.tipo === 'musica' ? (item.titulo || '—') : (item.descricao || '—')}
          </span>
          {item.artista && <span className={styles.itemArtista}>{item.artista}</span>}
          {item.tipo === 'musica' && item.tom_padrao && (
            <span className="badge badge-gold" style={{ fontSize: 10 }}>{tomResolvido || item.tom_padrao}</span>
          )}
        </div>
        {tonsVocalistas?.length === 1 && (
          <div className={styles.itemTons}>
            🎤 {tonsVocalistas[0].nome} → {tonsVocalistas[0].tom}
          </div>
        )}
        {tonsVocalistas?.length > 1 && (
          <div onClick={e => e.stopPropagation()}>
            <div className={styles.itemTons} style={{ marginBottom: 5 }}>
              {tonsVocalistas.length} vocalistas com tom salvo — marque o principal:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tonsVocalistas.map(t => {
                const ativo = t.membro_id === item.vocal_principal_id;
                return (
                  <button
                    key={t.membro_id}
                    onClick={() => onMarcarPrincipal?.(item, t.membro_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 99,
                      border: ativo ? '1.5px solid var(--gold)' : '0.5px solid var(--border)',
                      background: ativo ? 'rgba(201,168,76,0.12)' : 'transparent',
                      color: ativo ? 'var(--gold)' : 'var(--muted)',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >🎤 {t.nome} → {t.tom}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {isAdmin && (
        <button
          className={styles.itemRemover}
          onClick={() => onRemover(item.id)}
          title="Remover"
        >✕</button>
      )}
    </div>
  );
}

// ─── InsertBetweenBtn ─────────────────────────────────────────────────────────

function InsertBetweenBtn({ onClick }) {
  return (
    <div className={styles.insertBetween}>
      <button className={styles.insertBtn} onClick={onClick}>+ item</button>
    </div>
  );
}

// ─── PainelLouvores ───────────────────────────────────────────────────────────

function PainelLouvores({ louvoresList, selecionados, onToggle, jaNoRepertorio, onAdicionar, adicionando, extraBodyPad }) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');

  const b = busca.toLowerCase();
  const filtrados = louvoresList.filter(l => {
    const matchBusca = !busca ||
      l.titulo.toLowerCase().includes(b) ||
      l.artista?.toLowerCase().includes(b);
    const matchCat = !categoria || l.tipo === categoria;
    return matchBusca && matchCat;
  });

  return (
    <div className={styles.painelCard}>
      <div className={styles.painelHeader}>
        <input
          className="input"
          style={{ fontSize: 13, marginBottom: 8 }}
          placeholder="Buscar por título ou artista..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <div className={styles.categoriaFiltros}>
          <button
            className={`btn btn-sm ${!categoria ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCategoria('')}
          >Todos</button>
          {CATEGORIAS.map(c => (
            <button
              key={c}
              className={`btn btn-sm ${categoria === c ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCategoria(v => v === c ? '' : c)}
            >{c}</button>
          ))}
        </div>
      </div>

      <div className={styles.painelBody} style={extraBodyPad ? { paddingBottom: 80 } : undefined}>
        {filtrados.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '24px 12px', textAlign: 'center' }}>
            Nenhum louvor encontrado.
          </p>
        )}
        {filtrados.map(l => {
          const noCulto = jaNoRepertorio.has(l.id);
          const marcado = noCulto || selecionados.has(l.id);
          return (
            <label
              key={l.id}
              className={`${styles.louvorItem} ${noCulto ? styles.louvorJaAdicionado : ''}`}
            >
              <input
                type="checkbox"
                className={styles.louvorCheck}
                checked={marcado}
                disabled={noCulto}
                onChange={() => !noCulto && onToggle(l.id)}
              />
              <div className={styles.louvorInfo}>
                <div className={styles.louvorTitulo}>{l.titulo}</div>
                {l.artista && <div className={styles.louvorArtista}>{l.artista}</div>}
              </div>
              <div className={styles.louvorMeta}>
                {l.tom && <span className="badge badge-gold" style={{ fontSize: 10 }}>{l.tom}</span>}
                {l.tipo && <span className="badge badge-dim" style={{ fontSize: 10 }}>{l.tipo}</span>}
                {noCulto && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓</span>}
              </div>
            </label>
          );
        })}
      </div>

      <div className={styles.painelFooter}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {selecionados.size > 0
            ? `${selecionados.size} selecionado${selecionados.size > 1 ? 's' : ''}`
            : 'Nenhum selecionado'}
        </span>
        <button
          className="btn btn-primary btn-sm"
          disabled={selecionados.size === 0 || adicionando}
          onClick={onAdicionar}
        >
          {adicionando
            ? <span className="spinner" />
            : `Adicionar${selecionados.size > 0 ? ` (${selecionados.size})` : ''} ao repertório`}
        </button>
      </div>
    </div>
  );
}

// ─── PainelOrdem ──────────────────────────────────────────────────────────────

function PainelOrdem({ repertorio, isAdmin, onRemover, onReordenar, onNaoMusical, getTonsVocalistas, onMarcarPrincipal }) {
  const [modalLouvor, setModalLouvor] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const itens = repertorio.itens;
    const oldIndex = itens.findIndex(i => i.id === active.id);
    const newIndex  = itens.findIndex(i => i.id === over.id);
    onReordenar(oldIndex, newIndex);
  };

  const itens = repertorio?.itens || [];
  const totalMusicas = itens.filter(i => i.tipo === 'musica').length;
  const ultimaPosicao = itens.length > 0 ? Math.max(...itens.map(i => i.posicao)) : 0;

  return (
    <div className={styles.painelCard}>
      <div className={styles.painelHeader}>
        <h3 className={styles.painelTitulo}>Ordem do culto</h3>
      </div>

      <div className={styles.painelBody}>
        {itens.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 13 }}>
              Selecione louvores na lista {window.innerWidth > 768 ? 'ao lado' : 'em "Louvores"'} para montar a ordem.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itens.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className={styles.lista}>
                {isAdmin && (
                  <InsertBetweenBtn onClick={() => onNaoMusical(1)} />
                )}
                {itens.map(item => (
                  <div key={item.id}>
                    <SortableItem
                      item={item}
                      isAdmin={isAdmin}
                      onRemover={onRemover}
                      tonsVocalistas={getTonsVocalistas(item)}
                      onVerLouvor={setModalLouvor}
                      onMarcarPrincipal={onMarcarPrincipal}
                    />
                    {isAdmin && (
                      <InsertBetweenBtn onClick={() => onNaoMusical(item.posicao + 1)} />
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className={styles.painelFooter}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          {totalMusicas > 0 && ` · ${totalMusicas} ${totalMusicas === 1 ? 'música' : 'músicas'}`}
        </span>
        {isAdmin && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12 }}
            onClick={() => onNaoMusical(ultimaPosicao + 1)}
          >
            + item não musical
          </button>
        )}
      </div>

      {modalLouvor && (
        <ModalVisualizacaoLouvor
          louvorId={modalLouvor.louvorId}
          titulo={modalLouvor.titulo}
          artista={modalLouvor.artista}
          tomBase={modalLouvor.tomBase}
          tomVocalista={modalLouvor.tomVocalista}
          onFechar={() => setModalLouvor(null)}
        />
      )}
    </div>
  );
}

// ─── PainelEquipe ─────────────────────────────────────────────────────────────

function PainelEquipe({ escala }) {
  const total       = escala.length;
  const confirmados = escala.filter(e => e.confirmado).length;
  const aguardando  = total - confirmados;

  return (
    <div className={styles.painelCard}>
      <div className={styles.painelHeader}>
        <h3 className={styles.painelTitulo}>Equipe escalada</h3>
      </div>
      <div className={styles.painelBody}>
        {total === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '24px 12px', textAlign: 'center' }}>
            Nenhum músico escalado para este culto.
          </p>
        ) : (
          <>
            <div className={styles.resumoGrid}>
              <div className={styles.resumoCard}>
                <div className={styles.resumoValor} style={{ color: 'var(--blue)' }}>{total}</div>
                <div className={styles.resumoLabel}>Total</div>
              </div>
              <div className={styles.resumoCard}>
                <div className={styles.resumoValor} style={{ color: 'var(--green)' }}>{confirmados}</div>
                <div className={styles.resumoLabel}>Confirmados</div>
              </div>
              <div className={styles.resumoCard}>
                <div className={styles.resumoValor} style={{ color: 'var(--orange)' }}>{aguardando}</div>
                <div className={styles.resumoLabel}>Aguardando</div>
              </div>
              <div className={styles.resumoCard}>
                <div className={styles.resumoValor} style={{ color: 'var(--gold)' }}>
                  {Math.round((confirmados / total) * 100)}%
                </div>
                <div className={styles.resumoLabel}>Confirmação</div>
              </div>
            </div>

            <div className={styles.musicos}>
              {escala.map(item => {
                const nome = item.membro_id ? item.membro_nome : item.visitante_nome;
                const instrumento = item.instrumento_override
                  || (item.membro_id ? item.instrumento_nome : item.visitante_instrumento);
                const isVocal = item.membro_id ? item.is_vocal : item.visitante_vocal;
                const isVisitante = !item.membro_id;
                return (
                  <div key={item.id} className={styles.musicoCard}>
                    <Avatar nome={nome} size={32} />
                    <div className={styles.musicoInfo}>
                      <div className={styles.musicoNome}>{nome}</div>
                      <div className={styles.musicoInstrumento}>
                        {instrumento || (isVocal ? '🎤 Vocal' : '—')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                      {isVisitante && (
                        <span className="badge badge-orange" style={{ fontSize: 10 }}>Visitante</span>
                      )}
                      <span
                        className={`badge ${item.confirmado ? 'badge-green' : 'badge-dim'}`}
                        style={{ fontSize: 10 }}
                      >
                        {item.confirmado ? '✓' : '···'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ModalNaoMusical ──────────────────────────────────────────────────────────

function ModalNaoMusical({ onSalvar, onFechar, salvando }) {
  const [form, setForm] = useState({ tipo: 'oracao', descricao: '' });
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Inserir item não musical</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            {TIPOS_NAO_MUSICAIS.map(t => (
              <option key={t} value={t}>{TIPO_ITEM_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input
            className="input"
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Ex: Oração de abertura..."
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSalvar(form)} disabled={salvando}>
            {salvando ? <span className="spinner" /> : 'Inserir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ModalCompartilharEquipe ──────────────────────────────────────────────────

function ModalCompartilharEquipe({ texto, onFechar }) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 480, width: '90vw' }}>
        <div className="modal-header">
          <h2 className="modal-title">Compartilhar com a equipe</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <pre style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.6,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          maxHeight: '50vh',
          overflow: 'auto',
          margin: '0 0 16px',
        }}>
          {texto || 'Nada para compartilhar ainda.'}
        </pre>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleCopiar}>
            {copiado ? '✓ Copiado!' : '📋 Copiar texto'}
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: '#25D366',
              border: 'none',
              color: '#0a0a0a',
              fontWeight: 700,
            }}
            onClick={handleWhatsapp}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.129-.606.149-.149.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.247-.595-.495-.521-.669-.521-.173 0-.371-.025-.57-.025-.198 0-.52.074-.793.32-.272.247-1.04.916-1.04 2.23 0 1.314.95 2.59 1.083 2.76.133.173 1.798 2.748 4.358 3.875 2.56 1.124 2.56.751 3.024.706.47-.025 1.51-.595 1.732-1.165.223-.57.223-1.06.149-1.165z"/>
            </svg>
            Abrir no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Repertorio (main) ────────────────────────────────────────────────────────

export default function Repertorio() {
  const { usuario, isAdmin, isLiderOuAdmin } = useAuth();
  const canEdit = isLiderOuAdmin;
  const location = useLocation();

  const {
    cultosAll, cultosFiltrados, mesesDisponiveis,
    cultoId, setCultoId, mesSelecionado, setMesSelecionado, cultoAtual,
  } = useCultoProximo();

  const [repertorio, setRepertorio]           = useState(null);
  const [louvoresList, setLouvoresList]       = useState([]);
  const [escala, setEscala]                   = useState([]);
  const [tonesPorLouvor, setTonesPorLouvor]   = useState({});
  const [carregando, setCarregando]           = useState(false);
  const [selecionados, setSelecionados]       = useState(new Set());
  const [adicionando, setAdicionando]         = useState(false);
  const [abaMobile, setAbaMobile]             = useState('ordem');
  const [modalNaoMusical, setModalNaoMusical] = useState(null); // null | { posicao }
  const [salvandoNaoMusical, setSalvandoNaoMusical] = useState(false);
  const [palcoAberto, setPalcoAberto] = useState(false);
  const [estudarAberto, setEstudarAberto] = useState(false);
  const [modalCompartilhar, setModalCompartilhar] = useState(false);
  const overrideDashboardAplicado = useRef(false);

  // Carregar lista de louvores uma única vez
  useEffect(() => {
    louvoresApi.listar().then(setLouvoresList).catch(console.error);
  }, []);

  const carregarRepertorio = async (id) => {
    setCarregando(true);
    try {
      const [r, e] = await Promise.all([
        repertoriosApi.buscar(id).catch(() => null),
        escalasApi.buscar(id).catch(() => []),
      ]);
      setRepertorio(r);
      setEscala(e);

      // Carregar tons dos vocalistas por louvor
      if (r?.itens?.length) {
        const ids = [...new Set(
          r.itens.filter(i => i.tipo === 'musica' && i.louvor_id).map(i => i.louvor_id)
        )];
        const results = await Promise.all(
          ids.map(lid => louvoresApi.tons(lid).then(t => ({ lid, t })).catch(() => ({ lid, t: [] })))
        );
        const mapa = {};
        results.forEach(({ lid, t }) => { mapa[lid] = t; });
        setTonesPorLouvor(mapa);
      } else {
        setTonesPorLouvor({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (cultoId) {
      carregarRepertorio(cultoId);
      setSelecionados(new Set());
    } else {
      setRepertorio(null);
      setEscala([]);
      setTonesPorLouvor({});
    }
  }, [cultoId]);

  // Seleciona culto e abre palco automaticamente quando navega do Dashboard com state { palco: true }.
  // Só aplica depois que cultosAll já carregou, para não ser sobrescrito pela
  // auto-seleção do culto mais próximo dentro de useCultoProximo (que também
  // depende de uma chamada assíncrona à API e rodaria depois, revertendo a escolha).
  useEffect(() => {
    if (
      !overrideDashboardAplicado.current &&
      location.state?.palco &&
      location.state?.cultoId &&
      cultosAll.length > 0
    ) {
      overrideDashboardAplicado.current = true;
      setCultoId(String(location.state.cultoId));
      const timer = setTimeout(() => setPalcoAberto(true), 600);
      window.history.replaceState({}, '');
      return () => clearTimeout(timer);
    }
  }, [location.state, cultosAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────

  const jaNoRepertorio = new Set(
    repertorio?.itens
      ?.filter(i => i.tipo === 'musica' && i.louvor_id)
      .map(i => i.louvor_id) || []
  );

  const vocalistasEscalados = escala.filter(e => e.is_vocal && e.membro_id);

  const getTonsVocalistas = (item) => {
    if (item.tipo !== 'musica' || !item.louvor_id) return [];
    const tons = tonesPorLouvor[item.louvor_id] || [];
    return tons
      .filter(t => vocalistasEscalados.some(v => v.membro_id === t.membro_id))
      .map(t => ({ membro_id: t.membro_id, nome: t.vocalista_nome?.split(' ')[0] || '', tom: t.tom }));
  };

  // Resolve o tom já considerando o vocal principal marcado, ou o único vocalista com tom salvo
  const resolverTomVocalista = (item) => {
    const tons = getTonsVocalistas(item);
    if (tons.length === 0) return null;
    if (item.vocal_principal_id) {
      const principal = tons.find(t => t.membro_id === item.vocal_principal_id);
      if (principal) return principal.tom;
    }
    return tons.length === 1 ? tons[0].tom : null;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCriarRepertorio = async () => {
    try {
      await repertoriosApi.criar(parseInt(cultoId));
      await carregarRepertorio(cultoId);
    } catch (err) { alert(err.message); }
  };

  const handleMarcarVocalPrincipal = async (item, membroId) => {
    if (!repertorio) return;
    try {
      await repertoriosApi.atualizarItem(repertorio.id, item.id, { vocal_principal_id: membroId });
      await carregarRepertorio(cultoId);
    } catch (err) { alert(err.message); }
  };

  const handleToggleLouvor = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdicionarLote = async () => {
    if (selecionados.size === 0) return;
    setAdicionando(true);
    try {
      const louvoresParaAdd = [...selecionados].map(id => ({ louvor_id: id }));
      await repertoriosApi.adicionarLote(repertorio.id, louvoresParaAdd);
      await carregarRepertorio(cultoId);
      setSelecionados(new Set());
      setAbaMobile('ordem');
    } catch (err) { alert(err.message); }
    finally { setAdicionando(false); }
  };

  const handleRemoverItem = async (itemId) => {
    if (!confirm('Remover item?')) return;
    try {
      await repertoriosApi.removerItem(repertorio.id, itemId);
      await carregarRepertorio(cultoId);
    } catch (err) { alert(err.message); }
  };

  const handleReordenar = async (oldIndex, newIndex) => {
    const newItens = arrayMove(repertorio.itens, oldIndex, newIndex);
    const novaOrdem = newItens.map((item, idx) => ({ id: item.id, posicao: idx + 1 }));
    setRepertorio(r => ({
      ...r,
      itens: newItens.map((item, idx) => ({ ...item, posicao: idx + 1 })),
    }));
    try {
      await repertoriosApi.reordenar(repertorio.id, novaOrdem);
    } catch (err) {
      await carregarRepertorio(cultoId);
    }
  };

  const handleInserirNaoMusical = async ({ tipo, descricao }) => {
    setSalvandoNaoMusical(true);
    try {
      await repertoriosApi.adicionarItem(repertorio.id, {
        tipo,
        descricao: descricao || null,
        posicao: modalNaoMusical.posicao,
      });
      await carregarRepertorio(cultoId);
      setModalNaoMusical(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvandoNaoMusical(false);
    }
  };

  const formatarData = (dt) =>
    new Date(dt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  // ── Compartilhar com a equipe (texto formatado para WhatsApp) ──────────────

  const formatarDataCurta = (dt) => {
    const m = dt?.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}` : '';
  };

  const gerarTextoEquipe = () => {
    if (!repertorio || !cultoAtual) return '';
    const linhas = [];

    linhas.push(`Culto ${formatarDataCurta(cultoAtual.data_hora)}`);
    linhas.push('');

    escala.forEach(item => {
      const nome = item.membro_id
        ? item.membro_nome
        : (item.convidado_nome || item.visitante_nome);
      const instrumento = item.instrumento_override
        || (item.membro_id
          ? item.instrumento_nome
          : (item.convidado_instrumento || item.visitante_instrumento));
      const isVocal = item.membro_id
        ? item.is_vocal
        : (item.convidado_vocal ?? item.visitante_vocal);
      const label = instrumento || (isVocal ? 'Voz' : null);
      if (nome && label) linhas.push(`${label}: ${nome}`);
    });

    linhas.push('');

    repertorio.itens
      .filter(i => i.tipo === 'musica')
      .forEach(item => {
        const louvorCompleto = louvoresList.find(l => l.id === item.louvor_id);
        linhas.push(`• ${item.titulo}`);
        if (louvorCompleto?.youtube_url) linhas.push(louvorCompleto.youtube_url);
        linhas.push('');
      });

    return linhas.join('\n').trim();
  };

  // ── Render shared panels ──────────────────────────────────────────────────

  const makePainelLouvores = (extraBodyPad = false) => (
    <PainelLouvores
      louvoresList={louvoresList}
      selecionados={selecionados}
      onToggle={handleToggleLouvor}
      jaNoRepertorio={jaNoRepertorio}
      onAdicionar={handleAdicionarLote}
      adicionando={adicionando}
      extraBodyPad={extraBodyPad}
    />
  );

  const painelOrdem = repertorio ? (
    <PainelOrdem
      repertorio={repertorio}
      isAdmin={canEdit}
      onRemover={handleRemoverItem}
      onReordenar={handleReordenar}
      onNaoMusical={(posicao) => setModalNaoMusical({ posicao })}
      getTonsVocalistas={getTonsVocalistas}
      onMarcarPrincipal={handleMarcarVocalPrincipal}
    />
  ) : null;

  const painelEquipe = <PainelEquipe escala={escala} />;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Modo Palco */}
      {palcoAberto && repertorio && (
        <PalcoMode
          itens={repertorio.itens.filter(i => i.tipo === 'musica')}
          nomeCulto={cultoAtual?.nome || 'Culto'}
          tonsVocalistas={getTonsVocalistas}
          tonsPorItem={Object.fromEntries(
            repertorio.itens.filter(i => i.tipo === 'musica').map(i => [i.id, resolverTomVocalista(i)])
          )}
          onFechar={() => setPalcoAberto(false)}
        />
      )}

      {/* Modo Estudar */}
      {estudarAberto && repertorio && (
        <EstudarMode
          itens={repertorio.itens.filter(i => i.tipo === 'musica')}
          nomeCulto={cultoAtual?.nome || 'Culto'}
          tonsPorItem={Object.fromEntries(
            repertorio.itens.filter(i => i.tipo === 'musica').map(i => [i.id, resolverTomVocalista(i)])
          )}
          onFechar={() => setEstudarAberto(false)}
        />
      )}

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.titulo}>Repertório</h1>
          {cultoAtual && (
            <p className={styles.subtitulo}>
              {cultoAtual.nome} · {formatarData(cultoAtual.data_hora)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {repertorio && repertorio.itens.filter(i => i.tipo === 'musica').length > 0 && (
            <>
              <button
                onClick={() => setEstudarAberto(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px',
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  borderRadius: 12,
                  color: '#f0b429',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🎧 Estudar
              </button>
              <button
                onClick={() => setPalcoAberto(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px',
                  background: '#c9a84c',
                  border: 'none',
                  borderRadius: 12,
                  color: '#0a0a0a',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🎭 Palco
              </button>
              <button
                onClick={() => setModalCompartilhar(true)}
                title="Compartilhar"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '9px 14px',
                  background: 'rgba(37,211,102,0.12)',
                  border: '1px solid rgba(37,211,102,0.35)',
                  borderRadius: 12,
                  color: '#25D366',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            </>
          )}
          <div className={styles.seletorBar}>
            {mesesDisponiveis.length > 1 && (
            <select
              className="input"
              style={{ maxWidth: 170 }}
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
            >
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>
                  {mesLabel(cultosAll.find(c => mesChave(c.data_hora) === m)?.data_hora || '')}
                </option>
              ))}
            </select>
          )}
          <select
            className="input"
            style={{ maxWidth: 300 }}
            value={cultoId}
            onChange={e => setCultoId(e.target.value)}
          >
            <option value="">Selecionar culto...</option>
            {cultosFiltrados.map(c => (
              <option key={c.id} value={c.id}>
                {new Date(c.data_hora).toLocaleDateString('pt-BR')} — {c.nome}
              </option>
            ))}
          </select>
          </div>
        </div>
      </div>

      {/* ── Empty: sem cultos ── */}
      {cultosAll.length === 0 && (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>📅</div>
          <p>Nenhum culto agendado encontrado.</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cultos passados não são exibidos.</p>
        </div>
      )}

      {/* ── Empty: culto não selecionado ── */}
      {!cultoId && cultosAll.length > 0 && (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>📋</div>
          <p>Selecione um culto para montar o repertório.</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Cultos passados não são exibidos.</p>
        </div>
      )}

      {/* ── Loading ── */}
      {cultoId && carregando && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      )}

      {/* ── Sem repertório ── */}
      {cultoId && !carregando && !repertorio && (
        <div className={styles.vazio}>
          <div style={{ fontSize: 48 }}>📋</div>
          <p>Este culto ainda não tem repertório.</p>
          {canEdit && (
            <button className="btn btn-primary" onClick={handleCriarRepertorio}>
              Criar repertório
            </button>
          )}
        </div>
      )}

      {/* ── Conteúdo principal ── */}
      {cultoId && !carregando && repertorio && (
        <>
          {/* Desktop: 3 colunas */}
          <div className={styles.tresColumnas}>
            {makePainelLouvores()}
            {painelOrdem}
            {painelEquipe}
          </div>

          {/* Mobile: abas */}
          <div className={styles.tabsMobile}>
            <div className={styles.tabsBtns}>
              <button
                className={`${styles.tabBtn} ${abaMobile === 'ordem' ? styles.tabBtnAtivo : ''}`}
                onClick={() => setAbaMobile('ordem')}
              >📋 Ordem ({repertorio.itens.length})</button>
              <button
                className={`${styles.tabBtn} ${abaMobile === 'louvores' ? styles.tabBtnAtivo : ''}`}
                onClick={() => setAbaMobile('louvores')}
              >🎵 Louvores</button>
              <button
                className={`${styles.tabBtn} ${abaMobile === 'equipe' ? styles.tabBtnAtivo : ''}`}
                onClick={() => setAbaMobile('equipe')}
              >👥 Equipe ({escala.length})</button>
            </div>
            {abaMobile === 'louvores' && makePainelLouvores(selecionados.size > 0)}
            {abaMobile === 'ordem'    && (painelOrdem || (
              <div className={styles.vazio}>
                <p style={{ fontSize: 13 }}>Nenhum repertório ainda.</p>
              </div>
            ))}
            {abaMobile === 'equipe'   && painelEquipe}
          </div>

          {/* Mobile: botão flutuante para adicionar selecionados */}
          {abaMobile === 'louvores' && selecionados.size > 0 && (
            <div className={styles.floatingBtn}>
              <button
                className="btn btn-primary"
                onClick={handleAdicionarLote}
                disabled={adicionando}
              >
                {adicionando
                  ? <span className="spinner" />
                  : `Adicionar ${selecionados.size} ao repertório →`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modal: item não musical ── */}
      {modalNaoMusical && (
        <ModalNaoMusical
          onSalvar={handleInserirNaoMusical}
          onFechar={() => setModalNaoMusical(null)}
          salvando={salvandoNaoMusical}
        />
      )}

      {/* ── Modal: compartilhar com a equipe ── */}
      {modalCompartilhar && (
        <ModalCompartilharEquipe
          texto={gerarTextoEquipe()}
          onFechar={() => setModalCompartilhar(false)}
        />
      )}
    </div>
  );
}
