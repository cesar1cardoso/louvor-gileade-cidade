const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, adminMiddleware, liderOuAdminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/membros/instrumentos — lista todos os instrumentos cadastrados
router.get('/instrumentos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM instrumentos ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/membros
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
        json_agg(
          json_build_object(
            'ordem', mi.ordem,
            'instrumento_id', i.id,
            'instrumento_nome', i.nome,
            'instrumento_icone', i.icone
          ) ORDER BY mi.ordem
        ) FILTER (WHERE mi.id IS NOT NULL) AS instrumentos
      FROM membros m
      LEFT JOIN membro_instrumentos mi ON mi.membro_id = m.id
      LEFT JOIN instrumentos i ON i.id = mi.instrumento_id
      WHERE m.ativo = true
      GROUP BY m.id
      ORDER BY m.nome
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/membros
router.post('/', adminMiddleware, async (req, res) => {
  const { nome, telefone, email, foto_url, is_vocal, tipo, instrumentos } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO membros (nome, telefone, email, foto_url, is_vocal, tipo)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nome, telefone || null, email || null, foto_url || null, is_vocal || false, tipo || 'fixo']
    );
    const membro = result.rows[0];

    if (instrumentos && instrumentos.length > 0) {
      for (const inst of instrumentos) {
        await client.query(
          `INSERT INTO membro_instrumentos (membro_id, instrumento_id, ordem) VALUES ($1,$2,$3)
           ON CONFLICT (membro_id, ordem) DO UPDATE SET instrumento_id = EXCLUDED.instrumento_id`,
          [membro.id, inst.instrumento_id, inst.ordem]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(membro);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

// GET /api/membros/:id
// GET /api/membros/indisponibilidades-data?data=YYYY-MM-DD
// Retorna IDs de membros indisponíveis numa data específica
router.get('/indisponibilidades-data', async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ erro: 'Parâmetro data é obrigatório' });
  try {
    const result = await pool.query(
      `SELECT DISTINCT membro_id
       FROM membro_indisponibilidade
       WHERE $1::date BETWEEN data_inicio AND data_fim`,
      [data]
    );
    res.json(result.rows.map(r => r.membro_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
        json_agg(
          json_build_object(
            'ordem', mi.ordem,
            'instrumento_id', i.id,
            'instrumento_nome', i.nome,
            'instrumento_icone', i.icone
          ) ORDER BY mi.ordem
        ) FILTER (WHERE mi.id IS NOT NULL) AS instrumentos
      FROM membros m
      LEFT JOIN membro_instrumentos mi ON mi.membro_id = m.id
      LEFT JOIN instrumentos i ON i.id = mi.instrumento_id
      WHERE m.id = $1
      GROUP BY m.id
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ erro: 'Membro não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/membros/:id
router.patch('/:id', liderOuAdminMiddleware, async (req, res) => {
  const { nome, telefone, email, foto_url, is_vocal, tipo, instrumentos } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE membros SET
        nome = COALESCE($1, nome),
        telefone = COALESCE($2, telefone),
        email = COALESCE($3, email),
        foto_url = COALESCE($4, foto_url),
        is_vocal = COALESCE($5, is_vocal),
        tipo = COALESCE($6, tipo)
       WHERE id = $7`,
      [nome, telefone, email, foto_url, is_vocal, tipo, req.params.id]
    );

    if (instrumentos !== undefined) {
      await client.query('DELETE FROM membro_instrumentos WHERE membro_id = $1', [req.params.id]);
      for (const inst of instrumentos) {
        await client.query(
          `INSERT INTO membro_instrumentos (membro_id, instrumento_id, ordem) VALUES ($1,$2,$3)`,
          [req.params.id, inst.instrumento_id, inst.ordem]
        );
      }
    }

    await client.query('COMMIT');
    const updated = await pool.query('SELECT * FROM membros WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

// PATCH /api/membros/:id/inativar
router.patch('/:id/inativar', adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE membros SET ativo = false WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Membro inativado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/membros/:id/repertorio
router.get('/:id/repertorio', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.id, l.titulo, l.artista, l.tipo, l.tom AS tom_padrao,
             ltv.tom, ltv.observacao
      FROM louvores l
      LEFT JOIN louvor_tons_vocalista ltv ON ltv.louvor_id = l.id AND ltv.membro_id = $1
      ORDER BY l.titulo
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/membros/:id/disponibilidade
router.get('/:id/disponibilidade', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM membro_indisponibilidade WHERE membro_id = $1 ORDER BY data_inicio',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/membros/:id/disponibilidade
router.post('/:id/disponibilidade', liderOuAdminMiddleware, async (req, res) => {
  const { data_inicio, data_fim, motivo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO membro_indisponibilidade (membro_id, data_inicio, data_fim, motivo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, data_inicio, data_fim, motivo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/membros/:id/disponibilidade/:dId
router.delete('/:id/disponibilidade/:dId', liderOuAdminMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM membro_indisponibilidade WHERE id = $1 AND membro_id = $2',
      [req.params.dId, req.params.id]
    );
    res.json({ mensagem: 'Indisponibilidade removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
