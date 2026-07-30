import { useState } from 'react';
import { louvores as louvoresApi } from '../../../services/api';

export default function CifraEditor({ louvorId, cifraTexto, onSalvo, onCancelar }) {
  const [texto, setTexto] = useState(cifraTexto || '');
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await louvoresApi.atualizarCifra(louvorId, { cifra_texto: texto });
      onSalvo?.(texto);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder={`Cole ou digite a cifra aqui.\n\nFormato dos acordes: [G]palavra [D]outra\nLinha em branco separa seções.\n\nExemplo:\n[G]Há mis[D]térios que eu não con[Em]sigo`}
        style={{
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: 13,
          lineHeight: 1.7,
          minHeight: 320,
          resize: 'vertical',
          padding: '12px 14px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          color: 'var(--text)',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        color: 'var(--muted)',
        lineHeight: 1.8,
      }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Guia de formatação</strong>
        <code style={{ color: 'var(--gold)' }}>[G]texto</code> → acorde antes da sílaba<br />
        <code style={{ color: 'var(--gold)' }}>[D/F#]texto</code> → acorde com baixo<br />
        linha em branco → separa seções (Verso, Refrão, Pré-Refrão, Ponte…)
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary"
          onClick={handleSalvar}
          disabled={salvando}
        >
          {salvando ? <span className="spinner" /> : '✓ Salvar Cifra'}
        </button>
        <button className="btn btn-ghost" onClick={onCancelar}>
          ↺ Cancelar
        </button>
      </div>
    </div>
  );
}
