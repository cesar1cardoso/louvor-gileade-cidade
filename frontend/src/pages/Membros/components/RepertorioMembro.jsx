import { useState, useEffect } from 'react';
import { membros as membrosApi, louvores as louvoresApi } from '../../../services/api';
const TIPOS = ['Adoração','Louvor','Comunhão'];
const TONS_LIST = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'];

export default function RepertorioMembro({ membroId, isAdmin }) {
  const [repertorio, setRepertorio] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tom: '', capo: 0, observacao: '' });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const data = await membrosApi.repertorio(membroId);
    setRepertorio(data);
  };

  useEffect(() => { carregar(); }, [membroId]);

  const abrirEditar = (item) => {
    setEditando(item.id);
    setForm({ tom: item.tom || item.tom_padrao || 'G', capo: item.capo || 0, observacao: item.observacao || '' });
  };

  const handleSalvar = async (item) => {
    setSalvando(true);
    try {
      await louvoresApi.salvarTom(item.id, { membro_id: membroId, ...form });
      await carregar();
      setEditando(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (item) => {
    try {
      await louvoresApi.removerTom(item.id, membroId);
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtrado = repertorio.filter(i => !filtroTipo || i.tipo === filtroTipo);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 180 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>{filtrado.length} músicas</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtrado.map(item => (
          <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            {editando === item.id ? (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{item.titulo}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Tom</label>
                    <select className="input" style={{ fontSize: 13, padding: '4px 8px' }} value={form.tom} onChange={e => setForm(f => ({...f, tom: e.target.value}))}>
                      {TONS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>Capo</label>
                    <input type="number" className="input" style={{ fontSize: 13, padding: '4px 8px', width: 70 }} min={0} max={12} value={form.capo} onChange={e => setForm(f => ({...f, capo: parseInt(e.target.value) || 0}))} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Observação</label>
                    <input className="input" style={{ fontSize: 13, padding: '4px 8px' }} value={form.observacao} onChange={e => setForm(f => ({...f, observacao: e.target.value}))} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSalvar(item)} disabled={salvando}>
                      {salvando ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'OK'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>×</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.artista}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {item.tom ? (
                    <span className="badge badge-gold">{item.tom}{item.capo > 0 ? ` (capo ${item.capo})` : ''}</span>
                  ) : (
                    <span className="badge badge-dim">Sem tom</span>
                  )}
                  {item.observacao && <span style={{ fontSize: 12, color: 'var(--dim)' }}>💬 {item.observacao}</span>}
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(item)}>✏️</button>
                      {item.tom && <button className="btn btn-ghost btn-sm" onClick={() => handleRemover(item)}>🗑️</button>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
