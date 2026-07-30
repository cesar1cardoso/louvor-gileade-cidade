const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, liderOuAdminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/louvores
router.get('/', async (req, res) => {
  const { busca, tipo, tag, vocalista_id, ordem } = req.query;
  try {
    let where = [];
    let params = [];
    let idx = 1;

    if (busca) {
      // FTS + ILIKE fallback combinados: retorna resultados do FTS e também por título/artista
      where.push(`(
        l.busca_fts @@ plainto_tsquery('portuguese', $${idx})
        OR l.titulo ILIKE $${idx + 1}
        OR l.artista ILIKE $${idx + 1}
      )`);
      params.push(busca, `%${busca}%`);
      idx += 2;
    }
    if (tipo) {
      where.push(`l.tipo = $${idx}`);
      params.push(tipo);
      idx++;
    }
    if (tag) {
      where.push(`$${idx} = ANY(l.tags)`);
      params.push(tag);
      idx++;
    }

    let vocalistaCols = '';
    let vocalistaJoin = '';
    const vid = vocalista_id ? parseInt(vocalista_id) : NaN;
    if (!isNaN(vid)) {
      vocalistaCols = `, ltv.tom AS tom_vocalista`;
      vocalistaJoin = `LEFT JOIN louvor_tons_vocalista ltv ON ltv.louvor_id = l.id AND ltv.membro_id = $${idx}`;
      params.push(vid);
      idx++;
    }

    const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const orderBy = ordem === 'alfabetica' ? 'l.titulo ASC' : 'l.criado_em DESC';

    const query = `
      SELECT l.*,
        (SELECT COUNT(*) FROM louvor_historico lh WHERE lh.louvor_id = l.id) AS vezes_usada,
        (SELECT MAX(lh.data_culto) FROM louvor_historico lh WHERE lh.louvor_id = l.id) AS ultimo_uso
        ${vocalistaCols}
      FROM louvores l
      ${vocalistaJoin}
      ${whereStr}
      ORDER BY ${orderBy}
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/louvores/stats/mais-usadas
router.get('/stats/mais-usadas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.id, l.titulo, l.artista, l.tipo, COUNT(lh.id) AS vezes_usada,
             MAX(lh.data_culto) AS ultimo_uso
      FROM louvores l
      LEFT JOIN louvor_historico lh ON lh.louvor_id = l.id
      GROUP BY l.id
      ORDER BY vezes_usada DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/louvores/stats/sem-uso
router.get('/stats/sem-uso', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.id, l.titulo, l.artista, l.tipo,
             MAX(lh.data_culto) AS ultimo_uso
      FROM louvores l
      LEFT JOIN louvor_historico lh ON lh.louvor_id = l.id
      GROUP BY l.id
      HAVING MAX(lh.data_culto) < NOW() - INTERVAL '60 days'
          OR MAX(lh.data_culto) IS NULL
      ORDER BY ultimo_uso ASC NULLS FIRST
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/louvores/:id
router.get('/:id', async (req, res) => {
  try {
    const [louvor, tons] = await Promise.all([
      pool.query('SELECT * FROM louvores WHERE id = $1', [req.params.id]),
      pool.query(`
        SELECT ltv.*, m.nome AS vocalista_nome
        FROM louvor_tons_vocalista ltv
        JOIN membros m ON m.id = ltv.membro_id
        WHERE ltv.louvor_id = $1
      `, [req.params.id]),
    ]);

    if (louvor.rows.length === 0) return res.status(404).json({ erro: 'Louvor não encontrado' });
    res.json({ ...louvor.rows[0], tons_vocalistas: tons.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/louvores
router.post('/', liderOuAdminMiddleware, async (req, res) => {
  const { titulo, artista, tom, bpm, compasso, tipo, tags, letra, cifra_url, youtube_url } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'Título é obrigatório' });
  try {
    const result = await pool.query(
      `INSERT INTO louvores (titulo, artista, tom, bpm, compasso, tipo, tags, letra, cifra_url, youtube_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [titulo, artista || null, tom || null, bpm || null, compasso || '4/4', tipo || null, tags || null, letra || null, cifra_url || null, youtube_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/louvores/:id
router.patch('/:id', liderOuAdminMiddleware, async (req, res) => {
  const { titulo, artista, tom, bpm, compasso, tipo, tags, cifra_url, youtube_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE louvores SET
        titulo = COALESCE($1, titulo),
        artista = COALESCE($2, artista),
        tom = COALESCE($3, tom),
        bpm = COALESCE($4, bpm),
        compasso = COALESCE($5, compasso),
        tipo = COALESCE($6, tipo),
        tags = COALESCE($7, tags),
        cifra_url = COALESCE($8, cifra_url),
        youtube_url = COALESCE($9, youtube_url)
       WHERE id = $10 RETURNING *`,
      [titulo, artista, tom, bpm, compasso, tipo, tags, cifra_url, youtube_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Louvor não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/louvores/:id/cifra
router.patch('/:id/cifra', liderOuAdminMiddleware, async (req, res) => {
  const { cifra_texto, cifra_url } = req.body;
  const sets = [];
  const params = [];
  let idx = 1;

  if (cifra_texto !== undefined) { sets.push(`cifra_texto = $${idx++}`); params.push(cifra_texto); }
  if (cifra_url  !== undefined) { sets.push(`cifra_url = $${idx++}`);  params.push(cifra_url);  }

  if (sets.length === 0) return res.status(400).json({ erro: 'Nenhum campo enviado' });

  params.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE louvores SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Louvor não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/louvores/:id/letra
router.patch('/:id/letra', liderOuAdminMiddleware, async (req, res) => {
  const { letra } = req.body;
  try {
    const result = await pool.query(
      'UPDATE louvores SET letra = $1 WHERE id = $2 RETURNING *',
      [letra, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/louvores/:id/youtube
router.patch('/:id/youtube', liderOuAdminMiddleware, async (req, res) => {
  const { youtube_url } = req.body;
  try {
    const result = await pool.query(
      'UPDATE louvores SET youtube_url = $1 WHERE id = $2 RETURNING *',
      [youtube_url, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/louvores/:id
router.delete('/:id', liderOuAdminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM louvores WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Louvor removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/louvores/:id/tons
router.get('/:id/tons', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ltv.*, m.nome AS vocalista_nome
      FROM louvor_tons_vocalista ltv
      JOIN membros m ON m.id = ltv.membro_id
      WHERE ltv.louvor_id = $1
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/louvores/:id/tons
router.post('/:id/tons', liderOuAdminMiddleware, async (req, res) => {
  const { membro_id, tom, observacao } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO louvor_tons_vocalista (louvor_id, membro_id, tom, observacao)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (louvor_id, membro_id) DO UPDATE
         SET tom = EXCLUDED.tom, observacao = EXCLUDED.observacao
       RETURNING *`,
      [req.params.id, membro_id, tom, observacao || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/louvores/:id/tons/:membroId
router.delete('/:id/tons/:membroId', liderOuAdminMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM louvor_tons_vocalista WHERE louvor_id = $1 AND membro_id = $2',
      [req.params.id, req.params.membroId]
    );
    res.json({ mensagem: 'Tom removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/louvores/:id/historico
router.get('/:id/historico', async (req, res) => {
  try {
    const [listaRes, statsRes] = await Promise.all([
      pool.query(`
        SELECT lh.id, lh.tom_usado, lh.data_culto, c.nome AS culto_nome, c.data_hora
        FROM louvor_historico lh
        JOIN cultos c ON c.id = lh.culto_id
        WHERE lh.louvor_id = $1
        ORDER BY lh.data_culto DESC
      `, [req.params.id]),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_usos,
          EXTRACT(DAY FROM NOW() - MAX(data_culto))::int AS dias_desde_ultimo_uso,
          (
            SELECT tom_usado FROM louvor_historico
            WHERE louvor_id = $1 AND tom_usado IS NOT NULL
            GROUP BY tom_usado ORDER BY COUNT(*) DESC LIMIT 1
          ) AS tom_mais_usado
        FROM louvor_historico
        WHERE louvor_id = $1
      `, [req.params.id]),
    ]);

    const stats = statsRes.rows[0];
    res.json({
      total_usos: stats.total_usos,
      dias_desde_ultimo_uso: stats.dias_desde_ultimo_uso,
      tom_mais_usado: stats.tom_mais_usado,
      historico: listaRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
