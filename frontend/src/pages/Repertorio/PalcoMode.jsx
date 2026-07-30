import { useState, useRef, useEffect } from 'react';
import { louvores as louvoresApi } from '../../services/api';

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// ── Transposição ───────────────────────────────────────────────
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

function extractTomFromCifra(cifraText) {
  if (!cifraText) return null;
  for (const line of cifraText.split('\n')) {
    const match = line.trim().match(/^Tom\s*[:\-]?\s*([A-G][#b]?)/i);
    if (match) return match[1];
  }
  return null;
}

// ── Detecta tipo de seção ──────────────────────────────────────
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

// ── Renderização da cifra (formato colchete [G]texto) ──────────
function renderCifraLinha(line, steps, fs) {
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
    <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 1, maxWidth: '100%', boxSizing: 'border-box' }}>
      {pairs.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', flexDirection: 'column' }}>
          {hasc && (
            <span style={{ fontSize: fs * 0.7, fontWeight: 800, color: 'var(--gold)', lineHeight: 1.3, fontFamily: 'monospace', minWidth: '0.4ch' }}>
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

function isChordOnlyLine(line) {
  const t = line.trim();
  if (!t) return false;
  const re = /^[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?$/;
  return t.split(/\s+/).every(tok => re.test(tok));
}

function transposeChordLine(line, steps) {
  if (!steps) return line;
  return line.replace(
    /[A-G](?:b|#)?(?:maj|min|dim|aug|sus|add|M|m)?\d{0,2}M?(?:\([^)]*\))*(?:\/[A-G](?:b|#)?)?/g,
    c => transposeChord(c, steps)
  );
}

function renderCifraContent(cifraTexto, steps, fs) {
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
      result.push(<div key={i}>{renderCifraLinha(line, steps, fs)}</div>);
      i++; continue;
    }

    if (isChordOnlyLine(line)) {
      const next = lines[i + 1];
      if (next?.trim() && !isChordOnlyLine(next) && !/^Tom\s*[:\-]?\s*[A-G]/i.test(next)) {
        result.push(
          <div key={i} style={{ marginBottom: 4, maxWidth: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: fs * 0.82, fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
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
        <div key={i} style={{ fontSize: fs * 0.82, fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', lineHeight: 1.8, marginBottom: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '100%' }}>
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

// ── Auto-scroll (Apresentação) ──────────────────────────────────
// px por tick (a cada 40ms) — 5 níveis de velocidade
const VELOCIDADES = [0.4, 0.8, 1.4, 2.2, 3.4];

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function PalcoMode({ itens, nomeCulto, onFechar, tonsPorItem, tonsVocalistas, initialLouvorId }) {
  const initialIdx = initialLouvorId ? Math.max(0, itens.findIndex(i => i.louvor_id === initialLouvorId)) : 0;
  const [idx, setIdx]             = useState(initialIdx);
  const [view, setView]           = useState('letra');
  const [stepsMap, setStepsMap]   = useState({});
  const [showTons, setShowTons]   = useState(false);
  const [fsIdx, setFsIdx]         = useState(3); // padrão 20px
  const [louvoresCache, setCache] = useState({});
  const [carregando, setLoad]     = useState(false);

  const [scrollAtivo, setScrollAtivo]   = useState(false);
  const [velocidadeMap, setVelocidadeMap] = useState({});

  const fs = FONT_SIZES[fsIdx];
  const touchX     = useRef(null);
  const selectorRef = useRef(null);
  const contentRef  = useRef(null);
  const scrollIntervalRef = useRef(null);
  const touchY = useRef(null);
  const scrollStartTop = useRef(0);

  const item     = itens[idx];
  const louvorId = item?.louvor_id;
  const louvor   = louvoresCache[louvorId];
  const tomBase  = louvor?.tom || extractTomFromCifra(louvor?.cifra_texto) || 'G';
  const steps    = stepsMap[louvorId] || 0;
  const tomAtual = transposeTom(tomBase, steps);
  const pct      = ((idx + 1) / itens.length) * 100;
  const velIdx   = velocidadeMap[louvorId] ?? 2;

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

  // Ao trocar de música: parar auto-scroll e voltar pro topo
  useEffect(() => {
    setScrollAtivo(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [idx]);

  // Motor do auto-scroll
  useEffect(() => {
    if (!scrollAtivo) {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      return;
    }
    const pxPorTick = VELOCIDADES[velIdx];
    scrollIntervalRef.current = setInterval(() => {
      const el = contentRef.current;
      if (!el) return;
      el.scrollTop += pxPorTick;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setScrollAtivo(false);
      }
    }, 40);
    return () => clearInterval(scrollIntervalRef.current);
  }, [scrollAtivo, velIdx]);

  // Pré-aplica o tom do vocal principal/único vocalista escalado, sem sobrescrever escolha manual.
  // Reage também a mudanças em tonsPorItem, pois esse dado pode chegar de forma assíncrona
  // (depois que o Palco já abriu) — sem isso, o tom sugerido nunca era aplicado se chegasse atrasado.
  const tomSugeridoAtual = tonsPorItem?.[item?.id];
  useEffect(() => {
    if (!louvorId || !tomBase) return;
    if (stepsMap[louvorId] !== undefined) return;
    if (tomSugeridoAtual && tomSugeridoAtual !== tomBase) {
      setStepsMap(m => ({ ...m, [louvorId]: stepsTo(tomBase, tomSugeridoAtual) }));
    }
  }, [louvorId, tomBase, tomSugeridoAtual]);

  // Rola a letra/cifra como se fosse "virar a página" (usado pelo Page Up/Page Down do pedal)
  function scrollPagina(direcao) {
    const el = contentRef.current;
    if (!el) return;
    if (scrollAtivo) setScrollAtivo(false); // pedal assume o controle manual
    el.scrollBy({ top: direcao * el.clientHeight * 0.85, behavior: 'smooth' });
  }

  // Teclado — inclui suporte a pedais de passar página Bluetooth (ex: Cube Turner),
  // que emulam teclas de teclado dependendo do modo configurado no pedal.
  useEffect(() => {
    const h = (e) => {
      // Setas e teclas de mídia: trocam de música (Modo 2 / Modo 5 do pedal)
      if (['ArrowRight', 'MediaTrackNext'].includes(e.key)) { next(); return; }
      if (['ArrowLeft', 'MediaTrackPrevious'].includes(e.key)) { prev(); return; }

      // Page Up / Page Down: rolam a letra/cifra na tela (Modo 3 do pedal — "virar página")
      if (e.key === 'PageDown' || e.key === 'ArrowDown') { e.preventDefault(); scrollPagina(1); return; }
      if (e.key === 'PageUp'   || e.key === 'ArrowUp')   { e.preventDefault(); scrollPagina(-1); return; }

      // Espaço ou Enter: liga/pausa o auto-scroll (Modo 4 do pedal)
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        toggleAutoScroll();
        return;
      }
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [idx, scrollAtivo]);

  // Fecha seletor ao clicar fora
  useEffect(() => {
    function h(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) setShowTons(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function next() { if (idx < itens.length - 1) { setIdx(i => i + 1); setShowTons(false); } }
  function prev() { if (idx > 0) { setIdx(i => i - 1); setShowTons(false); } }

  function onTouchStart(e) {
    // Os dois pedais pressionados ao mesmo tempo (multi-touch): liga/pausa a Apresentação
    if (e.touches.length >= 2) {
      toggleAutoScroll();
      touchX.current = null;
      touchY.current = null;
      return;
    }
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
    if (contentRef.current && contentRef.current.contains(e.target)) {
      scrollStartTop.current = contentRef.current.scrollTop;
      // Só pausa o auto-scroll se o toque foi DENTRO da área de texto
      if (scrollAtivo) setScrollAtivo(false);
    }
  }
  function onTouchEnd(e) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -60) next(); else if (dx > 60) prev();
    touchX.current = null;
    touchY.current = null;
  }

  // Rolagem vertical controlada manualmente (sem inércia nativa) — evita que um
  // arrasto/swipe muito rápido (ex: pedal de página) role a tela além do desejado.
  // Limita a no máximo ~90% da altura visível por gesto, como "virar uma página".
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleMove = (e) => {
      if (touchY.current === null) return;
      // Invertido: no modo Touch do pedal, "slide down" (pedal direito) deve subir a tela
      // Natural para toque com o dedo: arrastar para baixo mostra conteúdo anterior.
      // Obs: com o pedal físico (modo Touch), o botão pode fazer o oposto do desenho dele
      // devido a como o Android simula o gesto — não é possível acertar os dois ao mesmo tempo.
      const deltaY = touchY.current - e.touches[0].clientY;
      const max = el.clientHeight * 0.9;
      const clamped = Math.max(-max, Math.min(max, deltaY));
      el.scrollTop = scrollStartTop.current + clamped;
      e.preventDefault();
    };
    el.addEventListener('touchmove', handleMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleMove);
  }, []);

  const diminuir = () => setFsIdx(i => Math.max(0, i - 1));
  const aumentar = () => setFsIdx(i => Math.min(FONT_SIZES.length - 1, i + 1));

  const toggleAutoScroll = () => setScrollAtivo(v => !v);
  const diminuirVelocidade = () => setVelocidadeMap(m => ({ ...m, [louvorId]: Math.max(0, velIdx - 1) }));
  const aumentarVelocidade = () => setVelocidadeMap(m => ({ ...m, [louvorId]: Math.min(VELOCIDADES.length - 1, velIdx + 1) }));

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Sora', 'Segoe UI', sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* ── BARRA DE PROGRESSO ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 20 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' }} />
      </div>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, #1a1035 0%, var(--bg) 100%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 14px 10px',
        flexShrink: 0,
        zIndex: 15,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Info título */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.55)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nomeCulto} · {idx + 1} de {itens.length}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
              {louvor?.titulo || '...'}
            </div>
            {louvor?.artista && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{louvor.artista}</div>
            )}
          </div>

          {/* Controles direita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {/* A- A+ */}
            <button onClick={diminuir} disabled={fsIdx === 0} style={btnStyle}>A−</button>
            <button onClick={aumentar} disabled={fsIdx === FONT_SIZES.length - 1} style={btnStyle}>A+</button>

            {/* Tom */}
            <div ref={selectorRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setShowTons(v => !v)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,${showTons ? '0.55' : '0.22'})`,
                  borderRadius: 10, padding: '3px 10px', cursor: 'pointer', minWidth: 44,
                }}
              >
                <div style={{ fontSize: 7, color: 'var(--gold-glow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tom</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', lineHeight: 1.1 }}>{tomAtual}</div>
              </div>

              {showTons && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
                    background: 'var(--bg)', border: '0.5px solid rgba(255,255,255,0.08)',
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
                          border: isAt ? '1.5px solid var(--gold)' : isOr ? '0.5px solid var(--gold-glow)' : '0.5px solid rgba(255,255,255,0.06)',
                          background: isAt ? 'var(--gold)' : isOr ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                          color: isAt ? '#0a0806' : isOr ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
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

            {/* Sair */}
            <button onClick={onFechar} style={{ ...btnStyle, width: 34, height: 34, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>✕</button>
          </div>
        </div>

        {/* Tabs Letra / Cifra */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['letra', '📖 Letra'], ['cifra', '🎸 Cifra']].map(([v, l]) => (
            <button key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 14px', borderRadius: 99,
                border: view === v ? '1px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
                background: view === v ? 'var(--gold-glow)' : 'rgba(255,255,255,0.04)',
                color: view === v ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                fontSize: 12, fontWeight: view === v ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{l}</button>
          ))}

          {/* Divisor */}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

          {/* Auto-scroll (Apresentação) */}
          <button
            onClick={toggleAutoScroll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 99,
              border: scrollAtivo ? '1px solid rgba(110,231,183,0.55)' : '0.5px solid rgba(255,255,255,0.08)',
              background: scrollAtivo ? 'rgba(110,231,183,0.15)' : 'rgba(255,255,255,0.04)',
              color: scrollAtivo ? '#6ee7b7' : 'rgba(255,255,255,0.4)',
              fontSize: 12, fontWeight: scrollAtivo ? 700 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {scrollAtivo ? '⏸' : '▶'} {scrollAtivo ? 'Rolando' : 'Apresentação'}
          </button>

          {/* Controle de velocidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              onClick={diminuirVelocidade}
              disabled={velIdx === 0}
              style={{
                width: 22, height: 22, borderRadius: 6,
                border: '0.5px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: velIdx === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: 700, cursor: velIdx === 0 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}
            >−</button>
            <div style={{ display: 'flex', gap: 3 }} title={`Velocidade ${velIdx + 1} de ${VELOCIDADES.length}`}>
              {VELOCIDADES.map((_, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: i <= velIdx ? '#6ee7b7' : 'rgba(255,255,255,0.12)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
            <button
              onClick={aumentarVelocidade}
              disabled={velIdx === VELOCIDADES.length - 1}
              style={{
                width: 22, height: 22, borderRadius: 6,
                border: '0.5px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: velIdx === VELOCIDADES.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: 700, cursor: velIdx === VELOCIDADES.length - 1 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}
            >+</button>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div
        ref={contentRef}
        onWheel={() => { if (scrollAtivo) setScrollAtivo(false); }}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '20px 20px 100px',
          width: '100%', boxSizing: 'border-box',
          WebkitOverflowScrolling: 'auto', // rolagem manual controlada acima, sem inércia
        }}
      >
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div className="spinner" style={{ width: 28, height: 28, borderColor: '#222', borderTopColor: 'var(--gold)' }} />
          </div>
        ) : view === 'letra' ? (
          <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
            {(louvor?.letra || '').split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} style={{ height: 16 }} />;

              // Seção [Verso], [Refrão], etc.
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
            {renderCifraContent(louvor?.cifra_texto, steps, fs)}
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
        {/* Botão anterior */}
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

        {/* Dots */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {itens.map((_, i) => (
              <div key={i}
                onClick={() => setIdx(i)}
                style={{
                  height: 3, borderRadius: 99, cursor: 'pointer',
                  background: i === idx ? 'var(--gold)' : i < idx ? 'var(--gold-glow)' : 'rgba(255,255,255,0.08)',
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

        {/* Botão próximo */}
        <button
          onClick={next} disabled={idx === itens.length - 1}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
            background: idx === itens.length - 1 ? 'rgba(255,255,255,0.03)' : 'var(--gold-glow)',
            border: idx === itens.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : '1px solid rgba(201,168,76,0.3)',
            borderRadius: 10, padding: '8px 12px',
            color: idx === itens.length - 1 ? 'rgba(255,255,255,0.15)' : 'var(--gold)',
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
