import { useState, useEffect, useRef } from 'react';
import { louvores as louvoresApi } from '../../services/api';

// ── Carrega a API do player do YouTube (usada só quando Autoplay está ativo) ──
// Não interfere em nada do player "burro" (iframe simples) usado quando Autoplay está desligado.
function loadYoutubeIframeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    const callbackAnterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof callbackAnterior === 'function') callbackAnterior();
      resolve(window.YT);
    };
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

// ── Transposição (idêntica ao PalcoMode interno) ────────────────
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
    /[A-G](?:b|#)?(?:m|M|maj|min|dim|aug|sus|add|maj7|m7|M7|7M|7|9|11|13|6|5|4|2)?(?:\/[A-G](?:b|#)?)?/g,
    c => transposeChord(c, steps)
  );
}

// ── Detecção de tom dentro do texto da cifra ───────────────────
function extractTomFromCifra(cifraText) {
  if (!cifraText) return null;
  for (const line of cifraText.split('\n')) {
    const match = line.trim().match(/^Tom\s*[:\-]?\s*([A-G][#b]?)/i);
    if (match) return match[1];
  }
  return null;
}

// ── Extrai o ID do vídeo a partir de qualquer formato de link do YouTube ──
function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

// ── Detecta tipo de seção (mesma lógica do Modo Palco) ─────────
function getTipoSecao(linha) {
  const l = linha.toLowerCase();
  if (l.includes('refrão') || l.includes('refrao') || l.includes('coro')) return 'refrao';
  if (l.includes('ponte')) return 'ponte';
  if (l.includes('intro')) return 'intro';
  if (l.includes('outro')) return 'outro';
  return 'verso';
}

const SECAO_CORES = {
  verso:  { cor: '#a89ef7', borda: '#7c6fd4' },
  refrao: { cor: '#c4b5f7', borda: '#c4b5f7' },
  ponte:  { cor: '#6ee7b7', borda: '#6ee7b7' },
  intro:  { cor: '#93c5fd', borda: '#93c5fd' },
  outro:  { cor: '#888', borda: '#666' },
};

// ── Detecta se uma linha é só de acordes (mesma regex corrigida do cifra.js) ──
function isChordOnlyLine(line) {
  const t = line.trim();
  if (!t) return false;
  const re = /^[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?$/;
  return t.split(/\s+/).every(tok => re.test(tok));
}

// ── Renderização da cifra no formato colchete [G]texto (sem transposição) ──
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
      const tx = segs[i + 1]?.t === 'txt' ? segs[i + 1].v : '';
      pairs.push({ c: segs[i].v, t: tx });
      i += segs[i + 1]?.t === 'txt' ? 2 : 1;
    } else { pairs.push({ c: null, t: segs[i].v }); i++; }
  }

  const hasc = pairs.some(p => p.c);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 1, maxWidth: '100%', boxSizing: 'border-box' }}>
      {pairs.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', flexDirection: 'column' }}>
          {hasc && (
            <span style={{ fontSize: fs * 0.7, fontWeight: 800, color: '#f0b429', lineHeight: 1.3, fontFamily: 'monospace', minWidth: '0.4ch' }}>
              {p.c || '\u00A0'}
            </span>
          )}
          <span style={{ fontSize: fs, color: 'rgba(255,255,255,0.85)', lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'Crimson Pro', Georgia, serif" }}>
            {p.t || (p.c ? '\u00A0' : '')}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Renderização completa da cifra (formato brasileiro + colchete) ─────
function renderCifraContent(cifraTexto, fs, steps = 0) {
  if (!cifraTexto) return (
    <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 24 }}>
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
          <div key={i} style={{ marginBottom: 4, maxWidth: '100%', boxSizing: 'border-box' }}>
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

const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36];
const VIDEO_ALTURA = 'min(40vh, 260px)';

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function EstudarMode({ itens, nomeCulto, onFechar, tonsPorItem }) {
  const [idx, setIdx]               = useState(0);
  const [view, setView]             = useState('letra');
  const [videoAberto, setVideoAberto] = useState(true);
  const [fsIdx, setFsIdx]           = useState(3);
  const [louvoresCache, setCache]   = useState({});
  const [carregando, setLoad]       = useState(false);
  const [stepsMap, setStepsMap]     = useState({});
  const [showTons, setShowTons]     = useState(false);
  const selectorRef                 = useRef(null);

  // ── Novo: estado do Autoplay (persistido no aparelho) ──
  const [autoplay, setAutoplay]     = useState(() => {
    try { return localStorage.getItem('lcv_autoplay') === '1'; } catch { return false; }
  });
  const [estaPausado, setEstaPausado] = useState(false);
  const ytContainerRef  = useRef(null);
  const ytPlayerRef       = useRef(null);
  const semVideoTimerRef = useRef(null);
  const autoplayRef       = useRef(autoplay); // sempre com o valor mais recente, para o player (criado 1x) ler
  const nextRef            = useRef(null);     // idem, para next() mais recente

  const fs = FONT_SIZES[fsIdx];
  const touchX = useRef(null);

  const item     = itens[idx];
  const louvorId = item?.louvor_id;
  const louvor   = louvoresCache[louvorId];
  const tomBase  = louvor?.tom || extractTomFromCifra(louvor?.cifra_texto) || null;
  const steps    = stepsMap[louvorId] || 0;
  const tomAtual = tomBase ? (transposeTom(tomBase, steps) || tomBase) : null;
  const videoId  = getYoutubeId(louvor?.youtube_url);
  const pct      = ((idx + 1) / itens.length) * 100;

  // Carrega louvor atual + prefetch próximo
  useEffect(() => {
    async function carregar(id) {
      if (!id || louvoresCache[id]) return;
      setLoad(true);
      try {
        const l = await louvoresApi.buscar(id);
        setCache(c => ({ ...c, [id]: l }));
      } catch (e) { console.error(e); }
      finally { setLoad(false); }
    }
    if (louvorId) carregar(louvorId);
    const proxId = itens[idx + 1]?.louvor_id;
    if (proxId) carregar(proxId);
  }, [idx, louvorId]);

  // Bloquear scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fecha seletor de tons ao trocar de música
  useEffect(() => { setShowTons(false); }, [idx]);

  // ── Novo: pré-aplica o tom do vocal principal/único vocalista escalado, sem sobrescrever escolha manual ──
  useEffect(() => {
    if (!louvorId || !tomBase) return;
    if (stepsMap[louvorId] !== undefined) return;
    const tomSugerido = tonsPorItem?.[item?.id];
    if (tomSugerido && tomSugerido !== tomBase) {
      setStepsMap(m => ({ ...m, [louvorId]: stepsTo(tomBase, tomSugerido) }));
    }
  }, [louvorId, tomBase]);

  // Fecha seletor de tons ao clicar fora
  useEffect(() => {
    function h(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) setShowTons(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Novo: salva preferência de Autoplay no aparelho ──
  useEffect(() => {
    try { localStorage.setItem('lcv_autoplay', autoplay ? '1' : '0'); } catch {}
  }, [autoplay]);

  // ── Novo: mantém refs sempre atualizadas (evita "fechaduras antigas" dentro do player) ──
  useEffect(() => { autoplayRef.current = autoplay; });
  useEffect(() => { nextRef.current = next; });

  // ── Novo: música sem vídeo cadastrado + Autoplay ligado → avança sozinho após alguns segundos ──
  useEffect(() => {
    if (semVideoTimerRef.current) { clearTimeout(semVideoTimerRef.current); semVideoTimerRef.current = null; }
    if (!autoplay || videoId) return;
    semVideoTimerRef.current = setTimeout(() => { next(); }, 6000);
    return () => { if (semVideoTimerRef.current) clearTimeout(semVideoTimerRef.current); };
  }, [autoplay, videoId]);

  // ── Novo: cria o player do YouTube uma única vez (na primeira música com vídeo) ──
  // Depois disso, nunca é destruído/recriado — só recebe comandos (loadVideoById, playVideo, etc).
  useEffect(() => {
    if (ytPlayerRef.current || !videoId || !ytContainerRef.current) return;
    let destruido = false;
    loadYoutubeIframeApi().then((YT) => {
      if (destruido || ytPlayerRef.current || !ytContainerRef.current) return;
      try {
        ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, origin: window.location.origin },
          events: {
            onReady: (e) => {
              try {
                const ifr = e.target.getIframe?.();
                if (ifr) Object.assign(ifr.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', border: 'none', borderRadius: '10px' });
              } catch {}
              if (autoplayRef.current) { try { e.target.playVideo(); } catch {} }
            },
            onStateChange: (e) => {
              if (e.data === window.YT.PlayerState.ENDED && autoplayRef.current) nextRef.current?.();
              if (e.data === window.YT.PlayerState.PLAYING) setEstaPausado(false);
              if (e.data === window.YT.PlayerState.PAUSED) setEstaPausado(true);
            },
          },
        });
      } catch (err) { console.error(err); }
    });
    return () => { destruido = true; };
  }, [videoId]);

  // ── Novo: troca a música no player já existente (sem nunca recriar nada) ──
  useEffect(() => {
    if (!ytPlayerRef.current) return;
    try {
      if (videoId) {
        if (autoplay) ytPlayerRef.current.loadVideoById(videoId);   // carrega e já toca
        else ytPlayerRef.current.cueVideoById(videoId);              // carrega mas fica pausado (como sempre foi)
      } else {
        ytPlayerRef.current.pauseVideo(); // música sem vídeo: garante que o anterior pare
      }
    } catch (err) { console.error(err); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // ── Novo: liga/desliga a reprodução quando o toggle de Autoplay é acionado (mesma música) ──
  useEffect(() => {
    if (!ytPlayerRef.current) return;
    try {
      if (autoplay) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } catch (err) { console.error(err); }
  }, [autoplay]);

  // ── Novo: destrói o player só quando a tela de Estudar é fechada de fato ──
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current?.destroy) { try { ytPlayerRef.current.destroy(); } catch {} }
      ytPlayerRef.current = null;
    };
  }, []);

  // Teclado
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [idx]);

  function next() { if (idx < itens.length - 1) setIdx(i => i + 1); }
  function prev() { if (idx > 0) setIdx(i => i - 1); }

  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -60) next(); else if (dx > 60) prev();
    touchX.current = null;
  }

  const diminuir = () => setFsIdx(i => Math.max(0, i - 1));
  const aumentar = () => setFsIdx(i => Math.min(FONT_SIZES.length - 1, i + 1));

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, background: '#0d0d1a', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Sora', 'Segoe UI', sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* ── BARRA DE PROGRESSO ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 20 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#c9a84c', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' }} />
      </div>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, #1a1035 0%, #0d0d1a 100%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 14px 10px',
        flexShrink: 0,
        zIndex: 15,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.55)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🎧 Estudar · {nomeCulto} · {idx + 1} de {itens.length}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
              {louvor?.titulo || '...'}
            </div>
            {louvor?.artista && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{louvor.artista}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <button onClick={diminuir} disabled={fsIdx === 0} style={btnStyle}>A−</button>
            <button onClick={aumentar} disabled={fsIdx === FONT_SIZES.length - 1} style={btnStyle}>A+</button>

            {tomBase && (
              <div ref={selectorRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowTons(v => !v)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: showTons ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.1)',
                    border: `1px solid rgba(201,168,76,${showTons ? '0.55' : '0.22'})`,
                    borderRadius: 10, padding: '3px 10px', cursor: 'pointer', minWidth: 44,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ fontSize: 7, color: 'rgba(240,180,41,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>Tom</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f0b429', lineHeight: 1.1 }}>{tomAtual}</div>
                </div>

                {showTons && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                      background: 'rgba(8,8,14,0.98)', border: '0.5px solid rgba(255,255,255,0.08)',
                      borderRadius: 14, padding: 10,
                      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, minWidth: 200,
                    }}
                  >
                    <div style={{ gridColumn: '1/-1', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                      Escolher tom
                    </div>
                    {NOTES.map(tom => {
                      const isAt = tom === tomAtual, isOr = tom === tomBase;
                      return (
                        <button key={tom}
                          onClick={() => { setStepsMap(m => ({ ...m, [louvorId]: stepsTo(tomBase, tom) })); setShowTons(false); }}
                          style={{
                            padding: '8px 4px', borderRadius: 9, fontSize: 12,
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
                        onClick={() => { setStepsMap(m => ({ ...m, [louvorId]: 0 })); setShowTons(false); }}
                        style={{ gridColumn: '1/-1', marginTop: 5, padding: '7px 0', borderRadius: 9, border: '0.5px solid rgba(208,80,80,0.15)', background: 'rgba(208,80,80,0.05)', color: 'rgba(208,80,80,0.7)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >↺ Voltar para {tomBase}</button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button onClick={onFechar} style={{ ...btnStyle, width: 34, height: 34, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>✕</button>
          </div>
        </div>
      </div>

      {/* ── VÍDEO (recolhível) ── */}
      <div style={{
        height: videoAberto ? VIDEO_ALTURA : '0px',
        overflow: 'hidden',
        transition: 'height 0.25s ease',
        flexShrink: 0,
        padding: videoAberto ? '12px 14px 0' : '0 14px',
        boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
          {/* Container do player do YouTube — criado uma única vez, nunca removido da árvore */}
          <div ref={ytContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

          {/* Aviso de "sem vídeo" — sobreposto por cima quando a música atual não tem vídeo cadastrado */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 10,
            display: videoId ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d0d1a',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', padding: 16,
          }}>
            🎥 Vídeo não cadastrado para esta música
          </div>
        </div>
      </div>

      {/* ── ALÇA PARA RECOLHER/EXPANDIR O VÍDEO + AUTOPLAY ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px 4px', flexShrink: 0 }}>
        <button
          onClick={() => setVideoAberto(v => !v)}
          style={{
            background: 'transparent', border: 'none', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {videoAberto ? '▾ Ocultar vídeo' : '▸ Mostrar vídeo'}
          </span>
        </button>

        <button
          onClick={() => setAutoplay(v => !v)}
          style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 9px 4px 4px', borderRadius: 99,
            border: autoplay ? '1px solid rgba(240,180,41,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
            background: autoplay ? 'rgba(240,180,41,0.12)' : 'rgba(255,255,255,0.04)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{
            width: 24, height: 14, borderRadius: 99, position: 'relative', flexShrink: 0,
            background: autoplay ? '#f0b429' : 'rgba(255,255,255,0.15)',
            transition: 'background 0.2s ease',
          }}>
            <span style={{
              position: 'absolute', top: 2, width: 10, height: 10, borderRadius: '50%',
              background: autoplay ? '#1a1206' : 'rgba(255,255,255,0.6)',
              left: autoplay ? 12 : 2,
              transition: 'left 0.2s ease',
            }} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, color: autoplay ? '#f0b429' : 'rgba(255,255,255,0.4)' }}>
            Autoplay
          </span>
        </button>
      </div>

      {!autoplay ? (
      <>
      {/* ── TABS LETRA / CIFRA ── */}
      <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px', flexShrink: 0 }}>
        {[['letra', '📖 Letra'], ['cifra', '🎸 Cifra']].map(([v, l]) => (
          <button key={v}
            onClick={() => setView(v)}
            style={{
              padding: '6px 14px', borderRadius: 99,
              border: view === v ? '1px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
              background: view === v ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
              color: view === v ? '#f0b429' : 'rgba(255,255,255,0.3)',
              fontSize: 12, fontWeight: view === v ? 700 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{l}</button>
        ))}
      </div>

      {/* ── CONTEÚDO ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '4px 20px 100px',
        width: '100%', boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
      }}>
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div className="spinner" style={{ width: 28, height: 28, borderColor: '#222', borderTopColor: '#c9a84c' }} />
          </div>
        ) : view === 'letra' ? (
          <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
            {(louvor?.letra || '').split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} style={{ height: 16 }} />;

              if (line.startsWith('[') && line.includes(']')) {
                const tipo = getTipoSecao(line);
                const { cor, borda } = SECAO_CORES[tipo] || SECAO_CORES.verso;
                return (
                  <div key={i} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: cor,
                    borderLeft: `3px solid ${borda}`,
                    paddingLeft: 8, marginTop: 24, marginBottom: 6,
                    lineHeight: 1.4,
                  }}>
                    {line.replace(/[\[\]]/g, '')}
                  </div>
                );
              }

              return (
                <div key={i} style={{
                  fontSize: fs,
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.9,
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  maxWidth: '100%',
                }}>
                  {line}
                </div>
              );
            })}
            {!louvor?.letra && (
              <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 40, fontSize: 14 }}>
                Nenhuma letra cadastrada.
              </p>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
            {renderCifraContent(louvor?.cifra_texto, fs, steps)}
          </div>
        )}
      </div>

      {/* ── FOOTER NAVEGAÇÃO ── */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(255,255,255,0.03)',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        padding: '10px 14px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={prev} disabled={idx === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 12px', color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
            fontSize: 12, cursor: idx === 0 ? 'default' : 'pointer', fontFamily: 'inherit',
            minWidth: 80, maxWidth: 130, overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>‹</span>
          {idx > 0 && (
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }}>
              {louvoresCache[itens[idx - 1]?.louvor_id]?.titulo || '...'}
            </span>
          )}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {itens.map((_, i) => (
              <div key={i}
                onClick={() => setIdx(i)}
                style={{
                  height: 3, borderRadius: 99, cursor: 'pointer',
                  background: i === idx ? '#f0b429' : i < idx ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.08)',
                  width: i === idx ? 24 : 6,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            {idx + 1} de {itens.length} · {louvor?.artista || ''}
          </div>
        </div>

        <button
          onClick={next} disabled={idx === itens.length - 1}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
            background: idx === itens.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.15)',
            border: idx === itens.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : '1px solid rgba(201,168,76,0.3)',
            borderRadius: 10, padding: '8px 12px',
            color: idx === itens.length - 1 ? 'rgba(255,255,255,0.15)' : '#f0b429',
            fontSize: 12, cursor: idx === itens.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit',
            minWidth: 80, maxWidth: 130, overflow: 'hidden',
          }}
        >
          {idx < itens.length - 1 && (
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }}>
              {louvoresCache[itens[idx + 1]?.louvor_id]?.titulo || '...'}
            </span>
          )}
          <span style={{ fontSize: 18, flexShrink: 0 }}>›</span>
        </button>
      </div>
      </>
      ) : (
        /* ── MODO AUTOPLAY (simplificado) ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 24px 36px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, padding: '4px 12px', borderRadius: 99, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)' }}>
            <span style={{ fontSize: 12 }}>🔁</span>
            <span style={{ fontSize: 11, color: '#f0b429', fontWeight: 600 }}>Autoplay ativado</span>
          </div>

          <div style={{
            width: 140, height: 140, borderRadius: 16, marginBottom: 22,
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42,
          }}>🎵</div>

          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {louvor?.titulo || '...'}
          </div>
          {louvor?.artista && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>{louvor.artista}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 22 }}>
            <button
              onClick={prev} disabled={idx === 0}
              style={{
                background: 'transparent', border: 'none', fontSize: 28, padding: 6,
                color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                cursor: idx === 0 ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >⏮</button>

            <button
              onClick={() => {
                if (!ytPlayerRef.current) return;
                if (estaPausado) ytPlayerRef.current.playVideo();
                else ytPlayerRef.current.pauseVideo();
              }}
              disabled={!videoId}
              style={{
                width: 58, height: 58, borderRadius: '50%', border: 'none',
                background: videoId ? '#f0b429' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: videoId ? '#1a1206' : 'rgba(255,255,255,0.3)',
                cursor: videoId ? 'pointer' : 'default', fontFamily: 'inherit',
              }}
            >{videoId ? (estaPausado ? '▶' : '⏸') : '⏳'}</button>

            <button
              onClick={next} disabled={idx === itens.length - 1}
              style={{
                background: 'transparent', border: 'none', fontSize: 28, padding: 6,
                color: idx === itens.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                cursor: idx === itens.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >⏭</button>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {itens.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 99,
                background: i === idx ? '#f0b429' : i < idx ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.08)',
                width: i === idx ? 22 : 6,
              }} />
            ))}
          </div>

          {idx < itens.length - 1 ? (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Próxima: {louvoresCache[itens[idx + 1]?.louvor_id]?.titulo || '...'}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Última música do repertório
            </div>
          )}
          {!videoId && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10, textAlign: 'center' }}>
              🎥 Sem vídeo cadastrado — avançando automaticamente...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  width: 34, height: 34, borderRadius: 8,
  border: '0.5px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer', fontSize: 11, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};
