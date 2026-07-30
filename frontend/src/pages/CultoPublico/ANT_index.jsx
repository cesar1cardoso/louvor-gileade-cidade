import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styles from './CultoPublico.module.css';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const TIPO_LABELS = {
  oracao:    { icon: '🙏', label: 'Oração' },
  palavra:   { icon: '📖', label: 'Palavra / Sermão' },
  ofertorio: { icon: '💛', label: 'Ofertório' },
  comunhao:  { icon: '🍷', label: 'Comunhão' },
  aviso:     { icon: '📢', label: 'Aviso' },
  outro:     { icon: '📌', label: 'Outro' },
};

const FONT_SIZES = [14, 16, 18, 20, 24, 28];

// ── Transposição (idêntica ao modo palco interno) ───────────────
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

function transposeNote(n, s) {
  const i = NOTES.indexOf(n);
  return i === -1 ? n : NOTES[((i + s) % 12 + 12) % 12];
}

function transposeChord(c, s) {
  if (!s) return c;
  const e = { 'Db':'C#','Eb':'D#','Fb':'E','Gb':'F#','Ab':'G#','Bb':'A#','Cb':'B' };
  return c
    .replace(/^[A-G]b/, m => e[m] || m)
    .replace(/^[A-G]#?/, m => transposeNote(m, s))
    .replace(/\/[A-G]b/, m => '/' + (e[m.slice(1)] || m.slice(1)))
    .replace(/\/[A-G]#?/, m => '/' + transposeNote(m.slice(1), s));
}

function transposeTom(t, s) {
  return t ? t.replace(/^[A-G]#?/, m => transposeNote(m, s)) : '';
}

function stepsTo(o, d) {
  const oi = NOTES.indexOf((o || '').replace(/m$/, ''));
  const di = NOTES.indexOf((d || '').replace(/m$/, ''));
  return oi === -1 || di === -1 ? 0 : ((di - oi) + 12) % 12;
}

function transposeChordLine(line, steps) {
  if (!steps) return line;
  return line.replace(
    /[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?/g,
    c => transposeChord(c, steps)
  );
}

function formatarData(dt) {
  if (!dt) return '';
  const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(dt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const [, ano, mes, dia] = m;
  return new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatarHora(dt) {
  if (!dt) return '';
  const m = String(dt).match(/[T ](\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarExpiracao(dt) {
  if (!dt) return '';
  try {
    return new Date(dt).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return '';
    const [, ano, mes, dia, hora, min] = m;
    const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return `${dataLocal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${hora}:${min}`;
  }
}

function getIniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(' ');
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const AVATAR_CORES = [
  '#4f3ca8', '#185fa5', '#1a4d35', '#3B6D11', '#854F0B',
  '#993556', '#993C1D', '#0F6E56', '#534AB7',
];

const AVATAR_TEXTO = [
  '#c4b5f7', '#90c4f9', '#6ee7b7', '#a3e635', '#fcd34d',
  '#f9a8d4', '#fca5a5', '#5eead4', '#a5b4fc',
];

function getCorAvatar(nome) {
  if (!nome) return AVATAR_CORES[0];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_CORES[Math.abs(hash) % AVATAR_CORES.length];
}

function getCorTextoAvatar(nome) {
  if (!nome) return AVATAR_TEXTO[0];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_TEXTO[Math.abs(hash) % AVATAR_TEXTO.length];
}

// ── Renderização de cifra (idêntica ao modo palco interno) ─────
function renderCifraLinha(line, fs, steps = 0) {
  if (!line.trim()) return <div style={{ height: 14 }} />;
  const regex = /\[([^\]]+)\]/g;
  const segs = []; let last = 0, m;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) segs.push({ t: 'txt', v: line.slice(last, m.index) });
    segs.push({ t: 'chd', v: transposeChord(m[1], steps) });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ t: 'txt', v: line.slice(last) });

  const pairs = []; let i = 0;
  while (i < segs.length) {
    if (segs[i].t === 'chd') {
      const tx = segs[i+1]?.t === 'txt' ? segs[i+1].v : '';
      pairs.push({ c: segs[i].v, t: tx });
      i += segs[i+1]?.t === 'txt' ? 2 : 1;
    } else { pairs.push({ c: null, t: segs[i].v }); i++; }
  }

  const hasc = pairs.some(p => p.c);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 1, maxWidth: '100%' }}>
      {pairs.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', flexDirection: 'column' }}>
          {hasc && (
            <span style={{
              fontSize: fs * 0.7, fontWeight: 800, color: '#f0b429',
              lineHeight: 1.3, fontFamily: 'monospace', minWidth: '0.4ch',
            }}>
              {p.c || '\u00A0'}
            </span>
          )}
          <span style={{
            fontSize: fs, color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: "'Crimson Pro', Georgia, serif",
          }}>
            {p.t || (p.c ? '\u00A0' : '')}
          </span>
        </span>
      ))}
    </div>
  );
}

function isChordOnlyLine(line) {
  const t = line.trim();
  if (!t) return false;
  const re = /^[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?$/;
  return t.split(/\s+/).every(tok => re.test(tok));
}

function renderCifraContent(cifraTexto, fs, steps = 0) {
  if (!cifraTexto) return (
    <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 24, fontFamily: "'Sora',sans-serif" }}>
      Nenhuma cifra cadastrada.
    </p>
  );

  const lines = cifraTexto.split('\n');
  const result = []; let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { result.push(<div key={i} style={{ height: 16 }} />); i++; continue; }
    if (/^Tom\s*[:\-]?\s*[A-G]/i.test(line.trim())) { i++; continue; }

    if (/\[[^\]]+\]/.test(line)) {
      result.push(<div key={i}>{renderCifraLinha(line, fs, steps)}</div>);
      i++; continue;
    }

    if (isChordOnlyLine(line)) {
      const next = lines[i + 1];
      if (next?.trim() && !isChordOnlyLine(next) && !/^Tom\s*[:\-]?\s*[A-G]/i.test(next)) {
        result.push(
          <div key={i} style={{ marginBottom: 4, maxWidth: '100%' }}>
            <div style={{ fontSize: fs * 0.82, fontWeight: 700, color: '#f0b429', fontFamily: 'monospace', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {transposeChordLine(line, steps)}
            </div>
            <div style={{ fontSize: fs, color: 'rgba(255,255,255,0.85)', fontFamily: "'Crimson Pro', Georgia, serif", lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {next}
            </div>
          </div>
        );
        i += 2; continue;
      }
      result.push(
        <div key={i} style={{ fontSize: fs * 0.82, fontWeight: 700, color: '#f0b429', fontFamily: 'monospace', lineHeight: 1.8, marginBottom: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '100%' }}>
          {transposeChordLine(line, steps)}
        </div>
      );
      i++; continue;
    }

    result.push(
      <div key={i} style={{ fontSize: fs, color: 'rgba(255,255,255,0.85)', fontFamily: "'Crimson Pro', Georgia, serif", lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '100%', overflowWrap: 'break-word' }}>
        {line}
      </div>
    );
    i++;
  }
  return result;
}

function getTipoSecao(linha) {
  const l = linha.toLowerCase();
  if (l.includes('refrão') || l.includes('refrao') || l.includes('coro')) return 'refrao';
  if (l.includes('ponte')) return 'ponte';
  return 'verso';
}

// ── Modo Palco Visitante ───────────────────────────────────────
function PalcoVisitante({ musicas, indiceInicial = 0, nomeCulto, onFechar }) {
  const [idx, setIdx] = useState(indiceInicial);
  const [fontIndex, setFontIndex] = useState(2);
  const [touchStart, setTouchStart] = useState(null);
  const [stepsMap, setStepsMap] = useState({});
  const [showTons, setShowTons] = useState(false);
  const selectorRef = useRef(null);

  const musica = musicas[idx];
  const fontSize = FONT_SIZES[fontIndex];
  const temAnterior = idx > 0;
  const temProxima = idx < musicas.length - 1;
  const [view, setView] = useState('letra');

  const tomBase  = musica?.tom || '';
  const steps    = stepsMap[musica?.id] || 0;
  const tomAtual = transposeTom(tomBase, steps) || tomBase;

  useEffect(() => {
    setShowTons(false);
  }, [idx]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    function handler(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) setShowTons(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' && temProxima) setIdx(i => i + 1);
      if (e.key === 'ArrowLeft' && temAnterior) setIdx(i => i - 1);
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, temAnterior, temProxima]);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0 && temProxima) setIdx(i => i + 1);
      if (diff < 0 && temAnterior) setIdx(i => i - 1);
    }
    setTouchStart(null);
  };

  const linhas = (musica?.letra || '').split('\n');

  return (
    <div
      className={styles.palcoOverlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra de progresso */}
      <div className={styles.palcoBarra}>
        <div className={styles.palcoBarraFill} style={{ width: `${((idx + 1) / musicas.length) * 100}%` }} />
      </div>

      {/* Header */}
      <div className={styles.palcoHeader}>
        <div className={styles.palcoHeaderInfo}>
          <div className={styles.palcoContador}>{nomeCulto} · {idx + 1} de {musicas.length}</div>
          <div className={styles.palcoTitulo}>{musica?.titulo || '—'}</div>
          <div className={styles.palcoMeta}>
            {musica?.vocal && <span className={styles.palcoVocal}>🎤 {musica.vocal}</span>}
          </div>
        </div>
        <div className={styles.palcoAcoes}>
          <div className={styles.palcoFontControls}>
            <button className={styles.palcoBtnFont} onClick={() => setFontIndex(i => Math.max(0, i - 1))} disabled={fontIndex === 0}>A-</button>
            <button className={styles.palcoBtnFont} onClick={() => setFontIndex(i => Math.min(FONT_SIZES.length - 1, i + 1))} disabled={fontIndex === FONT_SIZES.length - 1}>A+</button>
          </div>

          {tomBase && (
            <div ref={selectorRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setShowTons(v => !v)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: showTons ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.1)',
                  border: `1px solid rgba(201,168,76,${showTons ? '0.55' : '0.22'})`,
                  borderRadius: 8, padding: '3px 9px', cursor: 'pointer', minWidth: 38,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ fontSize: 7, color: 'rgba(240,180,41,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>Tom</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f0b429', lineHeight: 1.1 }}>{tomAtual}</div>
              </div>

              {showTons && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                    background: 'rgba(8,8,14,0.98)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: 10,
                    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, minWidth: 190,
                  }}
                >
                  <div style={{ gridColumn: '1/-1', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                    Escolher tom
                  </div>
                  {NOTES.map(tom => {
                    const isAt = tom === tomAtual, isOr = tom === tomBase;
                    return (
                      <button key={tom}
                        onClick={() => { setStepsMap(m => ({ ...m, [musica.id]: stepsTo(tomBase, tom) })); setShowTons(false); }}
                        style={{
                          padding: '7px 4px', borderRadius: 9, fontSize: 12,
                          fontWeight: isAt || isOr ? 700 : 400, cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'center',
                          border: isAt ? '1.5px solid #f0b429' : isOr ? '0.5px solid rgba(240,180,41,0.25)' : '0.5px solid rgba(255,255,255,0.06)',
                          background: isAt ? '#c9a84c' : isOr ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                          color: isAt ? '#0a0806' : isOr ? '#f0b429' : 'rgba(255,255,255,0.4)',
                        }}
                      >{tom}</button>
                    );
                  })}
                  {steps !== 0 && (
                    <button
                      onClick={() => { setStepsMap(m => ({ ...m, [musica.id]: 0 })); setShowTons(false); }}
                      style={{ gridColumn: '1/-1', marginTop: 5, padding: '7px 0', borderRadius: 9, border: '0.5px solid rgba(208,80,80,0.15)', background: 'rgba(208,80,80,0.05)', color: 'rgba(208,80,80,0.7)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >↺ Voltar para {tomBase}</button>
                  )}
                </div>
              )}
            </div>
          )}

          <button className={styles.palcoBtnFechar} onClick={onFechar}>✕</button>
        </div>
      </div>

      {/* Tabs Letra / Cifra */}
      <div className={styles.palcoLinks}>
        <button
          type="button"
          onClick={() => setView('letra')}
          style={{
            padding: '7px 16px', borderRadius: 99,
            border: view === 'letra' ? '1px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
            background: view === 'letra' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
            color: view === 'letra' ? '#f0b429' : 'rgba(255,255,255,0.3)',
            fontSize: 12, fontWeight: view === 'letra' ? 700 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📖 Letra
        </button>
        {musica?.cifra_texto && (
          <button
            type="button"
            onClick={() => setView('cifra')}
            style={{
              padding: '7px 16px', borderRadius: 99,
              border: view === 'cifra' ? '1px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
              background: view === 'cifra' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
              color: view === 'cifra' ? '#f0b429' : 'rgba(255,255,255,0.3)',
              fontSize: 12, fontWeight: view === 'cifra' ? 700 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🎸 Cifra
          </button>
        )}
      </div>

      {/* Letra / Cifra */}
      <div className={styles.palcoBody}>
        {view === 'cifra' && musica?.cifra_texto ? (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {renderCifraContent(musica.cifra_texto, fontSize, steps)}
          </div>
        ) : musica?.letra ? (
          <div style={{ fontSize, lineHeight: 1.9, maxWidth: 600, margin: '0 auto' }}>
            {linhas.map((linha, i) => {
              if (!linha.trim()) return <div key={i} style={{ height: 16 }} />;
              if (linha.startsWith('[') && linha.includes(']')) {
                const tipo = getTipoSecao(linha);
                const cores = {
                  verso:  { cor: '#a89ef7', borda: '#7c6fd4' },
                  refrao: { cor: '#c4b5f7', borda: '#c4b5f7' },
                  ponte:  { cor: '#6ee7b7', borda: '#6ee7b7' },
                };
                const { cor, borda } = cores[tipo] || cores.verso;
                return (
                  <div key={i} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: cor,
                    borderLeft: `3px solid ${borda}`, borderRadius: 0,
                    paddingLeft: 8, marginTop: 24, marginBottom: 6,
                  }}>
                    {linha.replace(/[\[\]]/g, '')}
                  </div>
                );
              }
              return (
                <div key={i} style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  wordBreak: 'break-word', overflowWrap: 'break-word',
                }}>
                  {linha}
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.palcoSemLetra}>
            {view === 'cifra' ? 'Cifra não disponível para esta música.' : 'Letra não disponível para esta música.'}
          </p>
        )}
      </div>

      {/* Navegação */}
      <div className={styles.palcoNav}>
        <button
          className={`${styles.palcoBtnNav} ${!temAnterior ? styles.palcoBtnNavDisabled : ''}`}
          onClick={() => temAnterior && setIdx(i => i - 1)}
          disabled={!temAnterior}
        >
          <span className={styles.palcoSeta}>←</span>
          {temAnterior && <span className={styles.palcoNavNome}>{musicas[idx - 1]?.titulo}</span>}
        </button>

        <div className={styles.palcoDots}>
          {musicas.map((_, i) => (
            <button
              key={i}
              className={`${styles.palcoDot} ${i === idx ? styles.palcoDotAtivo : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>

        <button
          className={`${styles.palcoBtnNav} ${styles.palcoBtnNavDir} ${!temProxima ? styles.palcoBtnNavDisabled : ''}`}
          onClick={() => temProxima && setIdx(i => i + 1)}
          disabled={!temProxima}
        >
          {temProxima && <span className={styles.palcoNavNome}>{musicas[idx + 1]?.titulo}</span>}
          <span className={styles.palcoSeta}>→</span>
        </button>
      </div>
    </div>
  );
}

// ── Extrai o ID do vídeo a partir de qualquer formato de link do YouTube ──
function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

const VIDEO_ALTURA_VISITANTE = 'min(38vh, 240px)';

// ── Modo Estudar Visitante ──────────────────────────────────────
function EstudarVisitante({ musicas, indiceInicial = 0, nomeCulto, onFechar }) {
  const [idx, setIdx] = useState(indiceInicial);
  const [fontIndex, setFontIndex] = useState(2);
  const [touchStart, setTouchStart] = useState(null);
  const [view, setView] = useState('letra');
  const [videoAberto, setVideoAberto] = useState(true);
  const [stepsMap, setStepsMap] = useState({});
  const [showTons, setShowTons] = useState(false);
  const selectorRef = useRef(null);

  const musica = musicas[idx];
  const fontSize = FONT_SIZES[fontIndex];
  const temAnterior = idx > 0;
  const temProxima = idx < musicas.length - 1;
  const videoId = getYoutubeId(musica?.youtube_url);
  const tomBase = musica?.tom || null;
  const steps = stepsMap[musica?.id] || 0;
  const tomAtual = tomBase ? (transposeTom(tomBase, steps) || tomBase) : null;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' && temProxima) setIdx(i => i + 1);
      if (e.key === 'ArrowLeft' && temAnterior) setIdx(i => i - 1);
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, temAnterior, temProxima]);


  useEffect(() => { setShowTons(false); }, [idx]);

  useEffect(() => {
    function h(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) setShowTons(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0 && temProxima) setIdx(i => i + 1);
      if (diff < 0 && temAnterior) setIdx(i => i - 1);
    }
    setTouchStart(null);
  };

  const linhas = (musica?.letra || '').split('\n');

  return (
    <div
      className={styles.palcoOverlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra de progresso */}
      <div className={styles.palcoBarra}>
        <div className={styles.palcoBarraFill} style={{ width: `${((idx + 1) / musicas.length) * 100}%` }} />
      </div>

      {/* Header */}
      <div className={styles.palcoHeader}>
        <div className={styles.palcoHeaderInfo}>
          <div className={styles.palcoContador}>🎧 Estudar · {nomeCulto} · {idx + 1} de {musicas.length}</div>
          <div className={styles.palcoTitulo}>{musica?.titulo || '—'}</div>
          <div className={styles.palcoMeta}>
            {musica?.artista && <span>{musica.artista}</span>}
          </div>
        </div>
        <div className={styles.palcoAcoes}>
          <div className={styles.palcoFontControls}>
            <button className={styles.palcoBtnFont} onClick={() => setFontIndex(i => Math.max(0, i - 1))} disabled={fontIndex === 0}>A-</button>
            <button className={styles.palcoBtnFont} onClick={() => setFontIndex(i => Math.min(FONT_SIZES.length - 1, i + 1))} disabled={fontIndex === FONT_SIZES.length - 1}>A+</button>
          </div>

          {tomBase && (
            <div ref={selectorRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setShowTons(v => !v)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: showTons ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.1)',
                  border: `1px solid rgba(201,168,76,${showTons ? '0.55' : '0.22'})`,
                  borderRadius: 8, padding: '3px 9px', cursor: 'pointer', minWidth: 38,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ fontSize: 7, color: 'rgba(240,180,41,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>Tom</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f0b429', lineHeight: 1.1 }}>{tomAtual}</div>
              </div>

              {showTons && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                    background: 'rgba(8,8,14,0.98)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: 10,
                    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, minWidth: 190,
                  }}
                >
                  <div style={{ gridColumn: '1/-1', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                    Escolher tom
                  </div>
                  {NOTES.map(tom => {
                    const isAt = tom === tomAtual, isOr = tom === tomBase;
                    return (
                      <button key={tom}
                        onClick={() => { setStepsMap(m => ({ ...m, [musica.id]: stepsTo(tomBase, tom) })); setShowTons(false); }}
                        style={{
                          padding: '7px 4px', borderRadius: 9, fontSize: 12,
                          fontWeight: isAt || isOr ? 700 : 400, cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'center',
                          border: isAt ? '1.5px solid #f0b429' : isOr ? '0.5px solid rgba(240,180,41,0.25)' : '0.5px solid rgba(255,255,255,0.06)',
                          background: isAt ? '#c9a84c' : isOr ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                          color: isAt ? '#0a0806' : isOr ? '#f0b429' : 'rgba(255,255,255,0.4)',
                        }}
                      >{tom}</button>
                    );
                  })}
                  {steps !== 0 && (
                    <button
                      onClick={() => { setStepsMap(m => ({ ...m, [musica.id]: 0 })); setShowTons(false); }}
                      style={{ gridColumn: '1/-1', marginTop: 5, padding: '7px 0', borderRadius: 9, border: '0.5px solid rgba(208,80,80,0.15)', background: 'rgba(208,80,80,0.05)', color: 'rgba(208,80,80,0.7)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >↺ Voltar para {tomBase}</button>
                  )}
                </div>
              )}
            </div>
          )}

          <button className={styles.palcoBtnFechar} onClick={onFechar}>✕</button>
        </div>
      </div>

      {/* Vídeo (recolhível) */}
      <div style={{
        height: videoAberto ? VIDEO_ALTURA_VISITANTE : '0px',
        overflow: 'hidden',
        transition: 'height 0.25s ease',
        flexShrink: 0,
        padding: videoAberto ? '12px 16px 0' : '0 16px',
        boxSizing: 'border-box',
      }}>
        {videoId ? (
          <iframe
            key={videoId}
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 10 }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', padding: 16,
          }}>
            🎥 Vídeo não cadastrado para esta música
          </div>
        )}
      </div>

      {/* Alça para recolher/expandir o vídeo */}
      <button
        onClick={() => setVideoAberto(v => !v)}
        style={{
          background: 'transparent', border: 'none', padding: '8px 0 4px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          width: '100%', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {videoAberto ? '▾ Ocultar vídeo' : '▸ Mostrar vídeo'}
        </span>
      </button>

      {/* Tabs Letra / Cifra */}
      <div className={styles.palcoLinks}>
        <button
          type="button"
          onClick={() => setView('letra')}
          style={{
            padding: '7px 16px', borderRadius: 99,
            border: view === 'letra' ? '1px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
            background: view === 'letra' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
            color: view === 'letra' ? '#f0b429' : 'rgba(255,255,255,0.3)',
            fontSize: 12, fontWeight: view === 'letra' ? 700 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📖 Letra
        </button>
        {musica?.cifra_texto && (
          <button
            type="button"
            onClick={() => setView('cifra')}
            style={{
              padding: '7px 16px', borderRadius: 99,
              border: view === 'cifra' ? '1px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
              background: view === 'cifra' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
              color: view === 'cifra' ? '#f0b429' : 'rgba(255,255,255,0.3)',
              fontSize: 12, fontWeight: view === 'cifra' ? 700 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🎸 Cifra
          </button>
        )}
      </div>

      {/* Letra / Cifra */}
      <div className={styles.palcoBody}>
        {view === 'cifra' && musica?.cifra_texto ? (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {renderCifraContent(musica.cifra_texto, fontSize, steps)}
          </div>
        ) : musica?.letra ? (
          <div style={{ fontSize: fontSize, lineHeight: 1.9, maxWidth: 600, margin: '0 auto' }}>
            {linhas.map((linha, i) => {
              if (!linha.trim()) return <div key={i} style={{ height: 16 }} />;
              if (linha.startsWith('[') && linha.includes(']')) {
                const tipo = getTipoSecao(linha);
                const cores = {
                  verso:  { cor: '#a89ef7', borda: '#7c6fd4' },
                  refrao: { cor: '#c4b5f7', borda: '#c4b5f7' },
                  ponte:  { cor: '#6ee7b7', borda: '#6ee7b7' },
                };
                const { cor, borda } = cores[tipo] || cores.verso;
                return (
                  <div key={i} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: cor,
                    borderLeft: `3px solid ${borda}`, borderRadius: 0,
                    paddingLeft: 8, marginTop: 24, marginBottom: 6,
                  }}>
                    {linha.replace(/[\[\]]/g, '')}
                  </div>
                );
              }
              return (
                <div key={i} style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  wordBreak: 'break-word', overflowWrap: 'break-word',
                }}>
                  {linha}
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.palcoSemLetra}>
            {view === 'cifra' ? 'Cifra não disponível para esta música.' : 'Letra não disponível para esta música.'}
          </p>
        )}
      </div>

      {/* Navegação */}
      <div className={styles.palcoNav}>
        <button
          className={`${styles.palcoBtnNav} ${!temAnterior ? styles.palcoBtnNavDisabled : ''}`}
          onClick={() => temAnterior && setIdx(i => i - 1)}
          disabled={!temAnterior}
        >
          <span className={styles.palcoSeta}>←</span>
          {temAnterior && <span className={styles.palcoNavNome}>{musicas[idx - 1]?.titulo}</span>}
        </button>

        <div className={styles.palcoDots}>
          {musicas.map((_, i) => (
            <button
              key={i}
              className={`${styles.palcoDot} ${i === idx ? styles.palcoDotAtivo : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>

        <button
          className={`${styles.palcoBtnNav} ${styles.palcoBtnNavDir} ${!temProxima ? styles.palcoBtnNavDisabled : ''}`}
          onClick={() => temProxima && setIdx(i => i + 1)}
          disabled={!temProxima}
        >
          {temProxima && <span className={styles.palcoNavNome}>{musicas[idx + 1]?.titulo}</span>}
          <span className={styles.palcoSeta}>→</span>
        </button>
      </div>
    </div>
  );
}

// ── Card Música ────────────────────────────────────────────────
function CardMusica({ item }) {
  return (
    <div className={styles.musicaCard}>
      <div className={styles.musicaRow}>
        <span className={styles.musicaNum}>{item.posicao}</span>
        <div className={styles.musicaBody}>
          <div className={styles.musicaTitulo}>{item.titulo || '—'}</div>
          {item.artista && <div className={styles.musicaArtista}>{item.artista}</div>}
          {(item.tom || item.vocal) && (
            <div className={styles.musicaMetaRow}>
              {item.tom   && <span className={styles.musicaTomBadge}>🎵 {item.tom}</span>}
              {item.vocal && <span className={styles.musicaVocal}>🎤 {item.vocal}</span>}
            </div>
          )}
        </div>
      </div>
      {(item.youtube_url || item.cifra_url) && (
        <div className={styles.musicaBtns}>
          {item.youtube_url && (
            <a href={item.youtube_url} target="_blank" rel="noopener noreferrer" className={styles.btnYoutube}>
              ▶ YouTube
            </a>
          )}
          {item.cifra_url && (
            <a href={item.cifra_url} target="_blank" rel="noopener noreferrer" className={styles.btnCifra}>
              🎸 Cifra
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card Não Musical ───────────────────────────────────────────
function CardNaoMusical({ item }) {
  const info = TIPO_LABELS[item.tipo] || { icon: '📌', label: item.tipo };
  return (
    <div className={styles.itemNaoMusical}>
      <span className={styles.itemNaoMusicalNum}>{item.posicao}</span>
      <span className={styles.itemNaoMusicalIcon}>{info.icon}</span>
      <div>
        <div className={styles.itemNaoMusicalTitulo}>{item.descricao || info.label}</div>
        {item.descricao && item.descricao !== info.label && (
          <div className={styles.itemNaoMusicalTipo}>{info.label}</div>
        )}
      </div>
    </div>
  );
}

// ── CultoPublico ───────────────────────────────────────────────
export default function CultoPublico() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [palcoAberto, setPalcoAberto] = useState(false);
  const [estudarAberto, setEstudarAberto] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/public/culto/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) setErro(data.erro);
        else setDados(data);
      })
      .catch(() => setErro('Erro ao carregar dados do culto'))
      .finally(() => setCarregando(false));
  }, [token]);

  if (carregando) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <p>Carregando repertório...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={styles.erro}>
        <div className={styles.erroIcon}>🔒</div>
        <h2>Link inválido ou expirado</h2>
        <p>{erro}</p>
        <p className={styles.erroHint}>Peça um novo link ao responsável pelo culto.</p>
      </div>
    );
  }

  const { culto, equipe = [], repertorio = [], expira_em } = dados;
  const musicasComLetra = repertorio.filter(i => i.tipo === 'musica');

  return (
    <>
      <div className={styles.page}>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerInfos}>
              <div className={styles.headerBranding}>🎵 Louvor Casa Viva</div>
              <h1 className={styles.headerTitulo}>{culto.nome}</h1>
              <p className={styles.headerMeta}>
                📅 {formatarData(culto.data_hora)}
                <span className={styles.headerSep}>·</span>
                🕐 {formatarHora(culto.data_hora)}
                {culto.local && <><span className={styles.headerSep}>·</span>📍 {culto.local}</>}
              </p>
            </div>
            {musicasComLetra.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className={styles.btnEstudar} onClick={() => setEstudarAberto(true)}>
                  <span className={styles.btnPalcoIcon}>🎧</span>
                  <span className={styles.btnEstudarTexto}>Estudar</span>
                </button>
                <button className={styles.btnPalco} onClick={() => setPalcoAberto(true)}>
                  <span className={styles.btnPalcoIcon}>🎤</span>
                  <span className={styles.btnPalcoTexto}>Palco</span>
                  <span className={styles.btnPalcoCount}>{musicasComLetra.length} músicas</span>
                </button>
              </div>
            )}
          </div>
          <div className={styles.headerBadge}>
            ⏱ Acesso temporário · expira {formatarExpiracao(expira_em)}
          </div>
        </header>

        <div className={styles.container}>

          {/* Equipe */}
          {equipe.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>👥 Equipe escalada</h2>
              <div className={styles.equipeGrid}>
                {equipe.map((membro, i) => (
                  <div key={i} className={`${styles.membroCard} ${membro.visitante ? styles.membroCardVisitante : ''}`}>
                    <div
                      className={styles.membroAvatar}
                      style={{ background: getCorAvatar(membro.nome), color: getCorTextoAvatar(membro.nome) }}
                    >
                      {getIniciais(membro.nome)}
                    </div>
                    <div className={styles.membroInfo}>
                      <div className={styles.membroNome}>
                        {membro.nome}
                        {membro.visitante && <span className={styles.badgeVisitante}>Visitante</span>}
                      </div>
                      {membro.instrumento && <div className={styles.membroInstrumento}>{membro.instrumento}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Repertório */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              🎵 Repertório
              <span className={styles.sectionCount}>{repertorio.length} itens</span>
            </h2>
            {repertorio.length === 0 ? (
              <div className={styles.vazio}><p>Repertório ainda não foi montado.</p></div>
            ) : (
              <div className={styles.repertorioList}>
                {repertorio.map(item => (
                  item.tipo === 'musica'
                    ? <CardMusica key={item.id} item={item} />
                    : <CardNaoMusical key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

        </div>

        <footer className={styles.rodape}>
          🔒 Este link é pessoal e expira após o culto.
        </footer>
      </div>

      {palcoAberto && (
        <PalcoVisitante
          musicas={musicasComLetra}
          nomeCulto={culto.nome}
          onFechar={() => setPalcoAberto(false)}
        />
      )}

      {estudarAberto && (
        <EstudarVisitante
          musicas={musicasComLetra}
          nomeCulto={culto.nome}
          onFechar={() => setEstudarAberto(false)}
        />
      )}
    </>
  );
}
