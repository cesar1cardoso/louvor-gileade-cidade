import { useState, useEffect } from 'react';
import { instrumentos as instrumentosApi } from '../../../services/api';

const FALLBACK = [
  { id: 1, nome: 'Violão', icone: '🎸' },
  { id: 2, nome: 'Guitarra', icone: '🎸' },
  { id: 3, nome: 'Baixo', icone: '🎸' },
  { id: 4, nome: 'Teclado', icone: '🎹' },
  { id: 5, nome: 'Bateria', icone: '🥁' },
  { id: 6, nome: 'Cajón', icone: '🥁' },
  { id: 7, nome: 'Flauta', icone: '🎺' },
  { id: 8, nome: 'Trompete', icone: '🎺' },
  { id: 9, nome: 'Violino', icone: '🎻' },
  { id: 10, nome: 'Saxofone', icone: '🎷' },
  { id: 11, nome: 'Pandeiro', icone: '🪘' },
  { id: 12, nome: 'Sanfona', icone: '🪗' },
];

export default function InstrumentosForm({ value = [], onChange }) {
  const [lista, setLista] = useState(FALLBACK);

  useEffect(() => {
    instrumentosApi.listar().then(setLista).catch(() => {});
  }, []);

  const set = (ordem, instrumento_id) => {
    const novos = [...value];
    const idx = novos.findIndex(i => i.ordem === ordem);
    if (instrumento_id === '') {
      if (idx !== -1) novos.splice(idx, 1);
    } else {
      const item = { instrumento_id: parseInt(instrumento_id), ordem };
      if (idx !== -1) novos[idx] = item;
      else novos.push(item);
    }
    onChange(novos);
  };

  const getVal = (ordem) => value.find(i => i.ordem === ordem)?.instrumento_id || '';
  const usados = value.map(i => i.instrumento_id);
  const opcoes = (ordem) => lista.filter(i => !usados.includes(i.id) || getVal(ordem) === i.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(ordem => (
        <div key={ordem} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--dim)', width: 80, flexShrink: 0 }}>
            {ordem === 1 ? 'Principal' : ordem === 2 ? '2º opção' : '3º opção'}
          </span>
          <select
            className="input"
            value={getVal(ordem)}
            onChange={e => set(ordem, e.target.value)}
          >
            <option value="">—</option>
            {opcoes(ordem).map(i => (
              <option key={i.id} value={i.id}>{i.icone} {i.nome}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
