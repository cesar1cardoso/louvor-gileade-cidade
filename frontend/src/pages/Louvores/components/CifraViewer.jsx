import { useState, useRef, useEffect } from 'react';
import {
  parsePairs, parseLineParts,
  transposeTom, ALL_TOMS, stepsParaTom
} from '../../../utils/cifra';

export default function CifraViewer({ cifraTexto, tomOriginal, titulo, artista }) {
  const [steps, setSteps]           = useState(0);
  const [fontSize, setFontSize]     = useState(15);
  const [apresentacao, setApres]    = useState(false);
  const [showSelector, setSelector] = useState(false);
  const selectorRef                 = useRef(null);

  const tomAtual = transposeTom(tomOriginal || 'G', steps);

  // Fecha seletor ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setSelector(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selecionarTom(tom) {
    setSteps(stepsParaTom(tomOriginal || 'G', tom));
    setSelector(false);
  }

  // ── Renderiza todos os pares da cifra (sem divisão por seção) ──
  function renderCifra(isDark) {
    const pairs = parsePairs(cifraTexto || '', steps);
    const textColor  = isDark ? '#c0bbda' : 'var(--text)';
    const chordColor = '#c9a84c';

    return pairs.map((item, idx) => {
      // Espaço entre blocos
      if (item.type === 'blank') {
        return <div key={idx} style={{ height: 16 }} />;
      }

      // Formato colchete: [G]texto
      if (item.type === 'inline') {
        const parts = parseLineParts(item.line, steps);
        const hasChords = parts.some(p => p.chord);
        return (
          <div key={idx} style={{
            display: 'flex',
            flexWrap: 'wrap',
            marginBottom: 2,
          }}>
            {parts.map((p, i) => (
              <span key={i} style={{ display: 'inline-flex', flexDirection: 'column' }}>
                {hasChords && (
                  <span style={{
                    fontSize: Math.round(fontSize * 0.82),
                    fontWeight: 700,
                    color: chordColor,
                    lineHeight: 1.4,
                    fontFamily: 'monospace',
                    minWidth: '0.5ch',
                    letterSpacing: '0.01em',
                  }}>
                    {p.chord || '\u00A0'}
                  </span>
                )}
                <span style={{
                  fontSize,
                  color: textColor,
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}>
                  {p.text || (p.chord ? '\u00A0' : '')}
                </span>
              </span>
            ))}
          </div>
        );
      }

      // Formato brasileiro: acorde em cima, texto embaixo
      if (item.type === 'chord-text') {
        return (
          <div key={idx} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: Math.round(fontSize * 0.85),
              fontWeight: 700,
              color: chordColor,
              lineHeight: 1.4,
              fontFamily: 'monospace',
              letterSpacing: '0.03em',
              whiteSpace: 'pre',
            }}>
              {item.chordLine}
            </div>
            <div style={{
              fontSize,
              color: textColor,
              lineHeight: 1.75,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {item.textLine}
            </div>
          </div>
        );
      }

      // Só acordes
      if (item.type === 'chord-only') {
        return (
          <div key={idx} style={{
            fontSize: Math.round(fontSize * 0.85),
            fontWeight: 700,
            color: chordColor,
            lineHeight: 1.8,
            fontFamily: 'monospace',
            marginBottom: 2,
            letterSpacing: '0.03em',
            whiteSpace: 'pre',
            overflowX: 'auto',
          }}>
            {item.chordLine}
          </div>
        );
      }

      // Texto puro (já filtrado "Tom:" no parsePairs)
      if (item.type === 'text') {
        return (
          <div key={idx} style={{
            fontSize,
            color: textColor,
            lineHeight: 1.75,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {item.line}
          </div>
        );
      }

      return null;
    });
  }

  // ── MODO APRESENTAÇÃO ──────────────────────────────────────────
  if (apresentacao) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#000', zIndex: 9999,
        overflowY: 'auto',
        fontFamily: "'Sora', 'Segoe UI', sans-serif",
      }}>
        {/* Header do modo apresentação */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '0.5px solid #222',
          flexWrap: 'wrap',
          gap: 10,
          position: 'sticky',
          top: 0,
          background: '#000',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {titulo}
              </div>
              {artista && (
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{artista}</div>
              )}
            </div>
            {/* Tom no modo apresentação */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(201,168,76,0.1)',
              border: '0.5px solid rgba(201,168,76,0.3)',
              borderRadius: 10, padding: '4px 10px',
            }}>
              <button
                onClick={() => setSteps(s => ((s - 1 + 12) % 12))}
                style={{ ...btnApresStyle, fontSize: 18, padding: '0 4px' }}
              >−</button>
              <span style={{
                color: '#c9a84c', fontWeight: 700, fontSize: 18,
                minWidth: 32, textAlign: 'center',
              }}>
                {tomAtual}
              </span>
              <button
                onClick={() => setSteps(s => (s + 1) % 12)}
                style={{ ...btnApresStyle, fontSize: 18, padding: '0 4px' }}
              >+</button>
            </div>
          </div>
          <button
            onClick={() => setApres(false)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: '0.5px solid #333',
              background: 'transparent', color: '#666',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600,
            }}
          >
            ✕ Sair
          </button>
        </div>

        {/* Corpo da apresentação */}
        <div style={{
          padding: '20px 24px 60px',
          columnWidth: 380,
          columnGap: 48,
        }}>
          {renderCifra(true)}
        </div>
      </div>
    );
  }

  // ── VISUALIZAÇÃO NORMAL ────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Sora', 'Segoe UI', sans-serif" }}>

      {/* ── HEADER: nome, artista e tom ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '0.5px solid var(--border)',
        flexWrap: 'wrap',
        gap: 10,
        background: 'var(--surface)',
        position: 'relative',
      }}>
        {/* Nome e artista */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {titulo}
          </div>
          {artista && (
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>
              {artista}
            </div>
          )}
        </div>

        {/* Tom clicável — abre grade */}
        <div ref={selectorRef} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => setSelector(v => !v)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: showSelector
                ? 'rgba(201,168,76,0.18)'
                : 'rgba(201,168,76,0.08)',
              border: showSelector
                ? '1px solid rgba(201,168,76,0.6)'
                : '0.5px solid rgba(201,168,76,0.25)',
              borderRadius: 12,
              padding: '6px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
          >
            <div style={{
              fontSize: 9, color: 'var(--dim)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2,
            }}>
              Tom
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', lineHeight: 1 }}>
                {tomAtual}
              </span>
              <span style={{ fontSize: 10, color: '#c9a84c', opacity: 0.6, marginTop: 4 }}>▾</span>
            </div>
            {steps !== 0 && (
              <div style={{ fontSize: 8, color: 'var(--dim)', marginTop: 2 }}>
                orig: {tomOriginal}
              </div>
            )}
          </div>

          {/* Grade de seleção de tons — abre abaixo do card */}
          {showSelector && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              zIndex: 100,
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 14,
              padding: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 5,
              minWidth: 200,
            }}>
              <div style={{
                gridColumn: '1/-1',
                fontSize: 9, fontWeight: 700, color: 'var(--dim)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                marginBottom: 6, paddingLeft: 2,
              }}>
                Escolher tom
              </div>

              {ALL_TOMS.map(tom => {
                const isAtual    = tom === tomAtual;
                const isOriginal = tom === (tomOriginal || 'G');
                return (
                  <button
                    key={tom}
                    onClick={() => selecionarTom(tom)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: isAtual
                        ? '1.5px solid #c9a84c'
                        : isOriginal
                          ? '0.5px solid rgba(201,168,76,0.35)'
                          : '0.5px solid var(--border)',
                      background: isAtual
                        ? '#c9a84c'
                        : isOriginal
                          ? 'rgba(201,168,76,0.1)'
                          : 'var(--card)',
                      color: isAtual ? '#0a0a0a' : isOriginal ? '#c9a84c' : 'var(--muted)',
                      fontSize: 13, fontWeight: isAtual || isOriginal ? 700 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s', textAlign: 'center',
                    }}
                  >
                    {tom}
                    {isOriginal && !isAtual && (
                      <div style={{ fontSize: 7, color: '#c9a84c', marginTop: 1 }}>orig</div>
                    )}
                  </button>
                );
              })}

              {steps !== 0 && (
                <button
                  onClick={() => { setSteps(0); setSelector(false); }}
                  style={{
                    gridColumn: '1/-1', marginTop: 6,
                    padding: '7px 0', borderRadius: 8,
                    border: '0.5px solid rgba(208,80,80,0.3)',
                    background: 'rgba(208,80,80,0.08)',
                    color: '#d05050', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ↺ Voltar para {tomOriginal || 'G'} (original)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── TOOLBAR: controles ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderBottom: '0.5px solid var(--border)',
        flexWrap: 'wrap',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}>

        {/* Ajuste rápido de tom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setSteps(s => ((s - 1 + 12) % 12))} style={btnTomStyle}>−</button>
          <span style={{
            minWidth: 36, height: 34, borderRadius: 8,
            border: '0.5px solid rgba(201,168,76,0.3)',
            background: 'rgba(201,168,76,0.06)',
            color: '#c9a84c', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}>
            {tomAtual}
          </span>
          <button onClick={() => setSteps(s => (s + 1) % 12)} style={btnTomStyle}>+</button>
        </div>

        {/* Dica de capo */}
        {steps > 0 && (
          <span style={{
            fontSize: 10,
            color: 'var(--dim)',
            background: 'var(--card)',
            border: '0.5px solid var(--border)',
            padding: '3px 8px',
            borderRadius: 6,
          }}>
            💡 Capo {steps} → toca em {tomOriginal || 'G'}
          </span>
        )}

        {/* Tamanho da fonte */}
        <div style={{ display: 'flex', gap: 3 }}>
          <button
            onClick={() => setFontSize(s => Math.max(10, s - 1))}
            style={btnFontStyle}
            title="Diminuir fonte"
          >A−</button>
          <button
            onClick={() => setFontSize(s => Math.min(24, s + 1))}
            style={btnFontStyle}
            title="Aumentar fonte"
          >A+</button>
        </div>

        {/* Botão Apresentar */}
        <button
          onClick={() => setApres(true)}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px',
            background: 'rgba(201,168,76,0.1)',
            border: '0.5px solid rgba(201,168,76,0.35)',
            borderRadius: 10,
            color: '#c9a84c',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          ⛶ Apresentar
        </button>
      </div>

      {/* ── CORPO DA CIFRA ── */}
      <div style={{
        padding: '16px 16px 100px',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {!cifraTexto || cifraTexto.trim() === ''
          ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--dim)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎸</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
                Nenhuma cifra cadastrada
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                Clique em "Editar" para adicionar a cifra desta música
              </div>
            </div>
          )
          : renderCifra(false)
        }
      </div>
    </div>
  );
}

// ── Estilos reutilizáveis ──────────────────────────────────────
const btnTomStyle = {
  width: 32, height: 34,
  borderRadius: 8,
  border: '0.5px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 18, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
};

const btnFontStyle = {
  width: 32, height: 30,
  borderRadius: 7,
  border: '0.5px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--dim)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 10, fontWeight: 700,
};

const btnApresStyle = {
  padding: '4px 8px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: '#c9a84c',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 20, fontWeight: 700,
};
