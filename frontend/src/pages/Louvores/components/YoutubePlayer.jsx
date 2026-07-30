import { useState } from 'react';
import styles from '../Louvores.module.css';

function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function YoutubePlayer({ url, onAtualizar, isAdmin }) {
  const [editando, setEditando] = useState(false);
  const [novoUrl, setNovoUrl] = useState(url || '');
  const [salvando, setSalvando] = useState(false);

  const videoId = getYoutubeId(url);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await onAtualizar(novoUrl);
      setEditando(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={styles.youtubeTab}>
      {videoId ? (
        <div className={styles.playerWrapper}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={styles.iframe}
          />
        </div>
      ) : (
        <div className={styles.semVideo}>
          <div style={{ fontSize: 48 }}>▶️</div>
          <p>Nenhum vídeo vinculado a esta música.</p>
        </div>
      )}

      {isAdmin && (
        <div className={styles.youtubeEdit}>
          {editando ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                value={novoUrl}
                onChange={e => setNovoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button className="btn btn-primary btn-sm" onClick={handleSalvar} disabled={salvando}>
                {salvando ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Salvar'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditando(true)}>
              ✏️ {url ? 'Alterar link' : 'Adicionar link YouTube'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
