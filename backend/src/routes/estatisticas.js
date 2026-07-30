const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/estatisticas/louvores
router.get('/louvores', async (req, res) => {
  try {
    const [rankingRes, esquecidosRes, timelineRes] = await Promise.all([
      // a) Top 10 louvores mais usados
      pool.query(`
        SELECT l.id AS louvor_id, l.titulo, l.artista,
               COUNT(lh.id)::int AS total_usos
        FROM louvores l
        LEFT JOIN louvor_historico lh ON lh.louvor_id = l.id
        GROUP BY l.id, l.titulo, l.artista
        ORDER BY total_usos DESC
        LIMIT 10
      `),

      // b) Louvores não usados há mais de 60 dias
      pool.query(`
        SELECT l.id, l.titulo, l.artista,
               MAX(lh.data_culto) AS ultimo_uso,
               EXTRACT(DAY FROM NOW() - MAX(lh.data_culto))::int AS dias_sem_usar
        FROM louvores l
        LEFT JOIN louvor_historico lh ON lh.louvor_id = l.id
        GROUP BY l.id, l.titulo, l.artista
        HAVING MAX(lh.data_culto) < NOW() - INTERVAL '60 days'
            OR MAX(lh.data_culto) IS NULL
        ORDER BY ultimo_uso ASC NULLS FIRST
      `),

      // c) Últimos 10 cultos realizados com seus louvores
      pool.query(`
        SELECT c.id, c.nome, c.data_hora,
          COALESCE(
            json_agg(
              json_build_object('titulo', l.titulo, 'artista', l.artista)
              ORDER BY ri.posicao
            ) FILTER (WHERE l.id IS NOT NULL),
            '[]'
          ) AS louvores
        FROM cultos c
        LEFT JOIN repertorios r     ON r.culto_id = c.id
        LEFT JOIN repertorio_itens ri ON ri.repertorio_id = r.id AND ri.tipo = 'musica'
        LEFT JOIN louvores l        ON l.id = ri.louvor_id
        WHERE c.status = 'realizado'
        GROUP BY c.id, c.nome, c.data_hora
        ORDER BY c.data_hora DESC
        LIMIT 10
      `),
    ]);

    res.json({
      ranking:    rankingRes.rows,
      esquecidos: esquecidosRes.rows,
      timeline:   timelineRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
