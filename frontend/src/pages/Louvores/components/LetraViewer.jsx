import { useState, useEffect } from 'react';
import styles from '../Louvores.module.css';

const SECAO_CORES = {
  '[Verso':      'var(--blue)',
  '[Refrão':     'var(--gold)',
  '[Refr':       'var(--gold)',
  '[Pré-Refrão': 'var(--orange)',
  '[Pr':         'var(--orange)',
  '[Ponte':      'var(--purple)',
  '[Coro':       'var(--gold)',
  '[Intro':      'var(--green)',
  '[Outro':      'var(--dim)',
};

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

function getCorSecao(linha) {
  for (const [key, cor] of Object.entries(SECAO_CORES)) {
    if (linha.startsWith(key)) return cor;
  }
  return 'var(--muted)';
}

function parseLinha(linha) {
  const isSecao = linha.startsWith('[') && linha.includes(']');
  return { texto: linha, isSecao };
}

export default function LetraViewer({ letra, youtubeUrl, isAdmin, onAtualizarLetra, onFecharApresentacao }) {
  const [fontIndex, setFontIndex] = useState(2); // padrão 16px
  const [apresentando, setApresentando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [novaLetra, setNovaLetra] = useState(letra || '');
  const [salvando, setSalvando] = useState(false);

  const fontSize = FONT_SIZES[fontIndex];
  const linhas = (letra || '').split('\n');

  const diminuir = () => setFontIndex(i => Math.max(0, i - 1));
  const aumentar = () => setFontIndex(i => Math.min(FONT_SIZES.length - 1, i + 1));

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await onAtualizarLetra(novaLetra);
      setEditando(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const sairApresentacao = () => {
    setApresentando(false);
    onFecharApresentacao?.();
  };

  // Bloquear scroll do body no modo palco
  useEffect(() => {
    if (apresentando) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [apresentando]);

  // Teclado: Escape para sair
  useEffect(() => {
    if (!apresentando) return;
    const handler = (e) => { if (e.key === 'Escape') sairApresentacao(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [apresentando]);

  if (apresentando) {
    return (
      <div className={styles.apresentacao}>

        {/* Controles fixos no topo */}
        <div className={styles.apresentacaoControles}>
          <button
            className={styles.apresentacaoBtnFont}
            onClick={diminuir}
            disabled={fontIndex === 0}
            aria-label="Diminuir fonte"
          >
            A-
          </button>
          <button
            className={styles.apresentacaoBtnFont}
            onClick={aumentar}
            disabled={fontIndex === FONT_SIZES.length - 1}
            aria-label="Aumentar fonte"
          >
            A+
          </button>
          <button
            className={styles.apresentacaoBtnSair}
            onClick={sairApresentacao}
          >
            ✕ Sair
          </button>
        </div>

        {/* Letra */}
        <div
          className={styles.apresentacaoLetra}
          style={{ fontSize, paddingTop: 60 }}
        >
          {linhas.map((linha, i) => {
            const { isSecao } = parseLinha(linha);
            if (linha.trim() === '') return <div key={i} className={styles.apresentacaoEspaco} />;
            if (isSecao) return (
              <div
                key={i}
                className={styles.apresentacaoSecao}
                style={{ color: getCorSecao(linha) }}
              >
                {linha}
              </div>
            );
            return <div key={i} className={styles.apresentacaoLinha}>{linha}</div>;
          })}
        </div>
      </div>
    );
  }

  if (editando) {
    return (
      <div className={styles.letraEdit}>
        <textarea
          className="input"
          rows={20}
          value={novaLetra}
          onChange={e => setNovaLetra(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
          placeholder="[Verso 1]&#10;Primeira linha...&#10;&#10;[Refrão]&#10;..."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
            {salvando ? <span className="spinner" /> : 'Salvar letra'}
          </button>
          <button className="btn btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.letraTab}>
      <div className={styles.letraControles}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={diminuir} disabled={fontIndex === 0}>A-</button>
          <button className="btn btn-ghost btn-sm" onClick={aumentar} disabled={fontIndex === FONT_SIZES.length - 1}>A+</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setApresentando(true)}
            title="Modo palco"
          >
            🎤 Apresentar
          </button>
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              ▶ Referência
            </a>
          )}
        </div>
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditando(true)}>✏️ Editar letra</button>
        )}
      </div>

      {!letra ? (
        <div className={styles.semLetra}>
          <p>Nenhuma letra cadastrada.</p>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setEditando(true)}>Adicionar letra</button>}
        </div>
      ) : (
        <div className={styles.letraBody} style={{ fontSize }}>
          {linhas.map((linha, i) => {
            const { isSecao } = parseLinha(linha);
            if (linha.trim() === '') return <div key={i} style={{ height: 12 }} />;
            if (isSecao) return (
              <div key={i} className={styles.letraSecao} style={{ color: getCorSecao(linha) }}>
                {linha}
              </div>
            );
            return <div key={i} className={styles.letraLinha}>{linha}</div>;
          })}
        </div>
      )}
    </div>
  );
}
