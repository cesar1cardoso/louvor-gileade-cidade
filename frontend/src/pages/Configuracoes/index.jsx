import { useState, useRef } from 'react';
import { backup as backupApi } from '../../services/api';
import styles from './Configuracoes.module.css';

export default function Configuracoes() {
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [arquivoRestore, setArquivoRestore] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const fileRef = useRef();

  const handleExportar = async () => {
    setExportando(true);
    try {
      const data = await backupApi.exportar();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMensagem('Backup exportado com sucesso!');
    } catch (err) {
      setMensagem('Erro ao exportar: ' + err.message);
    } finally {
      setExportando(false);
    }
  };

  const handleArquivoSelecionado = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivoRestore(file);
    setConfirmModal(true);
    e.target.value = '';
  };

  const handleRestaurar = async () => {
    setConfirmModal(false);
    setImportando(true);
    try {
      const texto = await arquivoRestore.text();
      const dados = JSON.parse(texto);
      await backupApi.importar(dados);
      setMensagem('Restore concluído! Os dados foram restaurados.');
    } catch (err) {
      setMensagem('Erro ao restaurar: ' + err.message);
    } finally {
      setImportando(false);
      setArquivoRestore(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.titulo}>Configurações</h1>
        <p className={styles.subtitulo}>Backup, restore e configurações do sistema</p>
      </div>

      {mensagem && (
        <div className={styles.alerta} onClick={() => setMensagem('')}>
          {mensagem} <span style={{ cursor: 'pointer', marginLeft: 8 }}>×</span>
        </div>
      )}

      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Backup e Restauração</h2>
        <p className={styles.secaoDesc}>
          Exporte todos os dados do sistema (membros, louvores, cultos, repertórios e escalas) em um único arquivo JSON.
          Para restaurar, importe um arquivo de backup previamente exportado.
        </p>

        <div className={styles.acoes}>
          <div className={styles.acaoCard}>
            <div className={styles.acaoIcon}>📥</div>
            <div className={styles.acaoInfo}>
              <div className={styles.acaoTitulo}>Exportar backup</div>
              <div className={styles.acaoDesc}>Baixa um arquivo JSON com todos os dados atuais</div>
            </div>
            <button className="btn btn-primary" onClick={handleExportar} disabled={exportando}>
              {exportando ? <span className="spinner" /> : 'Exportar JSON'}
            </button>
          </div>

          <div className={styles.acaoCard}>
            <div className={styles.acaoIcon}>📤</div>
            <div className={styles.acaoInfo}>
              <div className={styles.acaoTitulo}>Importar backup</div>
              <div className={styles.acaoDesc}>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>Atenção:</span> apaga todos os dados atuais e restaura o arquivo
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => fileRef.current.click()}
              disabled={importando}
            >
              {importando ? <span className="spinner" /> : 'Importar JSON'}
            </button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleArquivoSelecionado} />
          </div>
        </div>
      </div>

      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Recuperação de acesso de emergência</h2>
        <p className={styles.secaoDesc}>
          Caso o admin esqueça a senha e não consiga acessar o sistema, execute o comando abaixo no terminal:
        </p>
        <pre className={styles.code}>
          docker exec -it louvor_api node reset-admin.js
        </pre>
        <p className={styles.secaoDesc} style={{ fontSize: 13, color: 'var(--muted)' }}>
          O script solicitará o e-mail e a nova senha do administrador.
        </p>
      </div>

      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal fade-in" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">⚠️ Confirmar restore</h2>
            </div>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
              Esta ação irá <strong style={{ color: 'var(--red)' }}>apagar todos os dados atuais</strong> e substituí-los pelo conteúdo do arquivo:
            </p>
            <p style={{ fontWeight: 600, marginBottom: 24 }}>{arquivoRestore?.name}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setConfirmModal(false); setArquivoRestore(null); }}>
                Cancelar
              </button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }} onClick={handleRestaurar}>
                Sim, restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
