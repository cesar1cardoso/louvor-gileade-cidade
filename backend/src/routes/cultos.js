const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, adminMiddleware, liderOuAdminMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// GET /api/cultos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM escalas e WHERE e.culto_id = c.id) AS total_escala,
        (SELECT COUNT(*) FROM escalas e WHERE e.culto_id = c.id AND e.confirmado = true) AS confirmados
      FROM cultos c
      ORDER BY c.data_hora DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/cultos/proximos
router.get('/proximos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM escalas e WHERE e.culto_id = c.id) AS total_escala,
        (SELECT COUNT(*) FROM escalas e WHERE e.culto_id = c.id AND e.confirmado = true) AS confirmados
      FROM cultos c
      WHERE c.data_hora >= NOW() AND c.status = 'agendado'
      ORDER BY c.data_hora ASC
      LIMIT 3
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/cultos
router.post('/', liderOuAdminMiddleware, async (req, res) => {
  const { nome, data_hora, local, descricao, observacoes } = req.body;
  if (!nome || !data_hora) return res.status(400).json({ erro: 'Nome e data/hora são obrigatórios' });
  try {
    const result = await pool.query(
      `INSERT INTO cultos (nome, data_hora, local, descricao, observacoes, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nome, data_hora, local || null, descricao || null, observacoes || null, req.usuario.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/cultos/:id
router.get('/:id', async (req, res) => {
  try {
    const [culto, escala, repertorio] = await Promise.all([
      pool.query('SELECT * FROM cultos WHERE id = $1', [req.params.id]),
      pool.query(`
        SELECT e.*,
          m.nome AS membro_nome, m.foto_url,
          i.nome AS instrumento_nome, i.icone AS instrumento_icone
        FROM escalas e
        LEFT JOIN membros m ON m.id = e.membro_id
        LEFT JOIN instrumentos i ON i.id = e.instrumento_id
        WHERE e.culto_id = $1
        ORDER BY m.nome NULLS LAST
      `, [req.params.id]),
      pool.query(`
        SELECT r.id AS repertorio_id,
          ri.*,
          l.titulo, l.artista, l.tom, l.youtube_url
        FROM repertorios r
        LEFT JOIN repertorio_itens ri ON ri.repertorio_id = r.id
        LEFT JOIN louvores l ON l.id = ri.louvor_id
        WHERE r.culto_id = $1
        ORDER BY ri.posicao
      `, [req.params.id]),
    ]);

    if (culto.rows.length === 0) return res.status(404).json({ erro: 'Culto não encontrado' });
    res.json({ ...culto.rows[0], escala: escala.rows, repertorio: repertorio.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/cultos/:id
router.patch('/:id', liderOuAdminMiddleware, async (req, res) => {
  const { nome, data_hora, local, descricao, observacoes, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cultos SET
        nome = COALESCE($1, nome),
        data_hora = COALESCE($2, data_hora),
        local = COALESCE($3, local),
        descricao = COALESCE($4, descricao),
        observacoes = COALESCE($5, observacoes),
        status = COALESCE($6, status)
       WHERE id = $7 RETURNING *`,
      [nome, data_hora, local, descricao, observacoes, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Culto não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/cultos/:id/realizar
router.patch('/:id/realizar', liderOuAdminMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cultoResult = await client.query('SELECT * FROM cultos WHERE id = $1', [req.params.id]);
    if (cultoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Culto não encontrado' });
    }
    const culto = cultoResult.rows[0];

    await client.query(
      `UPDATE cultos SET status = 'realizado' WHERE id = $1`,
      [req.params.id]
    );

    // Gravar histórico de louvores
    const itens = await client.query(`
      SELECT ri.louvor_id, ri.tom_culto
      FROM repertorios r
      JOIN repertorio_itens ri ON ri.repertorio_id = r.id
      WHERE r.culto_id = $1 AND ri.louvor_id IS NOT NULL
    `, [req.params.id]);

    for (const item of itens.rows) {
      await client.query(
        `INSERT INTO louvor_historico (louvor_id, culto_id, tom_usado, data_culto)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (louvor_id, culto_id) DO NOTHING`,
        [item.louvor_id, req.params.id, item.tom_culto, culto.data_hora]
      );
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Culto marcado como realizado e histórico gravado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

// DELETE /api/cultos/:id
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cultos WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Culto não encontrado' });
    res.json({ mensagem: 'Culto excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/cultos/:id/link-visitante
router.get('/:id/link-visitante', liderOuAdminMiddleware, async (req, res) => {
  try {
    const cultoResult = await pool.query('SELECT * FROM cultos WHERE id = $1', [req.params.id]);
    if (cultoResult.rows.length === 0) return res.status(404).json({ erro: 'Culto não encontrado' });
    const culto = cultoResult.rows[0];

    const token = uuidv4().replace(/-/g, '');
    // pg retorna TIMESTAMP WITHOUT TZ como objeto Date com componentes UTC
    // iguais à hora local de Brasília armazenada (pois Render roda em UTC).
    // Para obter UTC real: hora armazenada + offset Brasília (UTC-3 = +3h) + 4h de validade.
    const _dt = culto.data_hora instanceof Date
      ? culto.data_hora
      : (() => { const m = String(culto.data_hora).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/); return m ? new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])) : new Date(culto.data_hora); })();
    const expiraEm = new Date(Date.UTC(
      _dt.getUTCFullYear(), _dt.getUTCMonth(), _dt.getUTCDate(),
      _dt.getUTCHours() + 3 + 4, _dt.getUTCMinutes()
    ));

    const result = await pool.query(
      `INSERT INTO links_temporarios (token, culto_id, descricao, expira_em)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [token, req.params.id, `Link visitante - ${culto.nome}`, expiraEm]
    );

    const url = `${process.env.BASE_URL}/culto/${token}`;
    res.json({ ...result.rows[0], url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
