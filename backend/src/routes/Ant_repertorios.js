const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, liderOuAdminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// POST /api/repertorios
router.post('/', liderOuAdminMiddleware, async (req, res) => {
  const { culto_id } = req.body;
  if (!culto_id) return res.status(400).json({ erro: 'culto_id é obrigatório' });
  try {
    const result = await pool.query(
      `INSERT INTO repertorios (culto_id, criado_por)
       VALUES ($1,$2)
       ON CONFLICT (culto_id) DO UPDATE SET criado_por = EXCLUDED.criado_por
       RETURNING *`,
      [culto_id, req.usuario.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/repertorios/:cultoId
router.get('/:cultoId', async (req, res) => {
  try {
    const rep = await pool.query(
      'SELECT * FROM repertorios WHERE culto_id = $1',
      [req.params.cultoId]
    );
    if (rep.rows.length === 0) return res.status(404).json({ erro: 'Repertório não encontrado' });

    const itens = await pool.query(`
      SELECT ri.*,
        l.titulo, l.artista, l.tom AS tom_padrao, l.youtube_url, l.letra, l.bpm, l.compasso
      FROM repertorio_itens ri
      LEFT JOIN louvores l ON l.id = ri.louvor_id
      WHERE ri.repertorio_id = $1
      ORDER BY ri.posicao
    `, [rep.rows[0].id]);

    res.json({ ...rep.rows[0], itens: itens.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/repertorios/:id/itens/batch — inserir múltiplas músicas de uma vez
router.post('/:id/itens/batch', liderOuAdminMiddleware, async (req, res) => {
  const { louvores } = req.body;
  if (!Array.isArray(louvores) || louvores.length === 0) {
    return res.status(400).json({ erro: 'louvores é obrigatório' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const maxRes = await client.query(
      'SELECT COALESCE(MAX(posicao), 0) AS max FROM repertorio_itens WHERE repertorio_id = $1',
      [req.params.id]
    );
    let posicao = parseInt(maxRes.rows[0].max);
    const inserted = [];
    for (const item of louvores) {
      posicao++;
      const result = await client.query(
        `INSERT INTO repertorio_itens (repertorio_id, tipo, louvor_id, posicao)
         VALUES ($1, 'musica', $2, $3) RETURNING *`,
        [req.params.id, item.louvor_id, posicao]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(inserted);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

// POST /api/repertorios/:id/itens
router.post('/:id/itens', liderOuAdminMiddleware, async (req, res) => {
  const { tipo, louvor_id, descricao, posicao, tom_culto, duracao_min, observacao } = req.body;
  try {
    // Ajustar posições existentes para abrir espaço
    await pool.query(
      `UPDATE repertorio_itens SET posicao = posicao + 1
       WHERE repertorio_id = $1 AND posicao >= $2`,
      [req.params.id, posicao]
    );

    const result = await pool.query(
      `INSERT INTO repertorio_itens
         (repertorio_id, tipo, louvor_id, descricao, posicao, tom_culto, duracao_min, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, tipo || 'musica', louvor_id || null, descricao || null, posicao, tom_culto || null, duracao_min || null, observacao || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/repertorios/:id/itens — reordenar
router.patch('/:id/itens', liderOuAdminMiddleware, async (req, res) => {
  const { ordem } = req.body; // Array de { id, posicao }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Usar posições temporárias negativas para evitar conflito de UNIQUE
    for (const item of ordem) {
      await client.query(
        'UPDATE repertorio_itens SET posicao = $1 WHERE id = $2 AND repertorio_id = $3',
        [-item.posicao - 1000, item.id, req.params.id]
      );
    }
    for (const item of ordem) {
      await client.query(
        'UPDATE repertorio_itens SET posicao = $1 WHERE id = $2 AND repertorio_id = $3',
        [item.posicao, item.id, req.params.id]
      );
    }
    await client.query('COMMIT');
    res.json({ mensagem: 'Ordem atualizada' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

// PATCH /api/repertorios/:id/itens/:itemId
router.patch('/:id/itens/:itemId', liderOuAdminMiddleware, async (req, res) => {
  const { tom_culto, duracao_min, observacao, descricao } = req.body;
  try {
    const result = await pool.query(
      `UPDATE repertorio_itens SET
        tom_culto = COALESCE($1, tom_culto),
        duracao_min = COALESCE($2, duracao_min),
        observacao = COALESCE($3, observacao),
        descricao = COALESCE($4, descricao)
       WHERE id = $5 AND repertorio_id = $6 RETURNING *`,
      [tom_culto, duracao_min, observacao, descricao, req.params.itemId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/repertorios/:id/itens/:itemId
router.delete('/:id/itens/:itemId', liderOuAdminMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM repertorio_itens WHERE id = $1 AND repertorio_id = $2',
      [req.params.itemId, req.params.id]
    );
    res.json({ mensagem: 'Item removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
