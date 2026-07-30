import { useState } from 'react';
import { escalas as escalasApi, membros as membrosApi } from '../../../services/api';

export default function ConvidadoForm({ cultoId, onSalvar, onFechar }) {
  const [form, setForm] = useState({ convidado_nome: '', convidado_instrumento: '', convidado_vocal: false });
  const [salvando, setSalvando] = useState(false);
  const [perguntarMembro, setPerguntarMembro] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const data = await escalasApi.adicionarConvidado({ culto_id: cultoId, ...form });
      setResultado(data);
      setPerguntarMembro(true);
    } catch (err) {
      alert(err.message);
      setSalvando(false);
    }
  };

  const handleSalvarComoMembro = async () => {
    try {
      await membrosApi.criar({
        nome: form.convidado_nome,
        tipo: 'convidado',
        is_vocal: form.convidado_vocal,
      });
      alert('Convidado salvo como membro!');
    } catch (err) {
      alert('Erro ao salvar como membro: ' + err.message);
    }
    onSalvar(resultado);
    onFechar();
  };

  const gerarLink = async () => {
    try {
      const { cultos: cultosApi2 } = await import('../../../services/api');
      const data = await cultosApi2.linkVisitante(cultoId);
      await navigator.clipboard.writeText(data.url);
      alert('Link copiado para a área de transferência!');
    } catch (err) {
      alert('Erro ao gerar link: ' + err.message);
    }
  };

  if (perguntarMembro) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
        <div className="modal fade-in" style={{ maxWidth: 400 }}>
          <div className="modal-header">
            <h2 className="modal-title">Convidado adicionado!</h2>
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
            Deseja salvar <strong>{form.convidado_nome}</strong> como membro fixo para futuros cultos?
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={handleSalvarComoMembro}>Salvar como membro</button>
            <button className="btn btn-ghost" onClick={() => { onSalvar(resultado); onFechar(); }}>Não, obrigado</button>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={gerarLink}>
            🔗 Gerar link de acesso para o convidado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal fade-in" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Adicionar convidado</h2>
          <button className="modal-close" onClick={onFechar}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="input" value={form.convidado_nome} onChange={e => setForm(f => ({...f, convidado_nome: e.target.value}))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Instrumento</label>
            <input className="input" value={form.convidado_instrumento} onChange={e => setForm(f => ({...f, convidado_instrumento: e.target.value}))} placeholder="Ex: Violão, Teclado..." />
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="vocal-conv" checked={form.convidado_vocal} onChange={e => setForm(f => ({...f, convidado_vocal: e.target.checked}))} />
            <label htmlFor="vocal-conv" className="form-label" style={{ marginBottom: 0 }}>🎤 É vocal</label>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <span className="spinner" /> : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
