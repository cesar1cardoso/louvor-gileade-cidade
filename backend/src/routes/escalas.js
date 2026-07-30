const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, liderOuAdminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/escalas/:cultoId
router.get('/:cultoId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        m.nome AS membro_nome, m.foto_url, m.is_vocal AS membro_vocal,
        i.nome AS instrumento_nome, i.icone AS instrumento_icone,
        (
          SELECT json_agg(json_build_object('data_inicio', mi.data_inicio, 'data_fim', mi.data_fim))
          FROM membro_indisponibilidade mi
          WHERE mi.membro_id = e.membro_id
        ) AS indisponibilidades
      FROM escalas e
      LEFT JOIN membros m ON m.id = e.membro_id
      LEFT JOIN instrumentos i ON i.id = e.instrumento_id
      WHERE e.culto_id = $1
      ORDER BY m.nome NULLS LAST, e.convidado_nome NULLS LAST
    `, [req.params.cultoId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/escalas — membro fixo
router.post('/', liderOuAdminMiddleware, async (req, res) => {
  const { culto_id, membro_id, instrumento_id, is_vocal } = req.body;
  if (!culto_id || !membro_id) return res.status(400).json({ erro: 'culto_id e membro_id são obrigatórios' });

  try {
    // Validar instrumento do membro
    if (instrumento_id) {
      const check = await pool.query(
        'SELECT * FROM membro_instrumentos WHERE membro_id = $1 AND instrumento_id = $2',
        [membro_id, instrumento_id]
      );
      if (check.rows.length === 0) {
        return res.status(400).json({ erro: 'Instrumento não pertence ao perfil do membro' });
      }
    }

    // Verificar disponibilidade
    const culto = await pool.query('SELECT data_hora FROM cultos WHERE id = $1', [culto_id]);
    const dataCulto = culto.rows[0]?.data_hora;
    const indisp = await pool.query(
      `SELECT * FROM membro_indisponibilidade
       WHERE membro_id = $1 AND data_inicio <= $2 AND data_fim >= $2`,
      [membro_id, dataCulto]
    );

    const result = await pool.query(
      `INSERT INTO escalas (culto_id, membro_id, instrumento_id, is_vocal)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (culto_id, membro_id) DO UPDATE
         SET instrumento_id = EXCLUDED.instrumento_id, is_vocal = EXCLUDED.is_vocal
       RETURNING *`,
      [culto_id, membro_id, instrumento_id || null, is_vocal || false]
    );

    res.status(201).json({
      ...result.rows[0],
      aviso_indisponibilidade: indisp.rows.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/escalas/convidado
router.post('/convidado', liderOuAdminMiddleware, async (req, res) => {
  const { culto_id, convidado_nome, convidado_instrumento, convidado_vocal } = req.body;
  if (!culto_id || !convidado_nome) return res.status(400).json({ erro: 'culto_id e convidado_nome são obrigatórios' });

  try {
    const result = await pool.query(
      `INSERT INTO escalas (culto_id, convidado_nome, convidado_instrumento, convidado_vocal)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [culto_id, convidado_nome, convidado_instrumento || null, convidado_vocal || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/escalas/:id/instrumento
router.patch('/:id/instrumento', liderOuAdminMiddleware, async (req, res) => {
  const { instrumento_override } = req.body;
  try {
    const result = await pool.query(
      `UPDATE escalas SET instrumento_override = $1 WHERE id = $2 RETURNING *`,
      [instrumento_override || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Entrada de escala não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/escalas/:id/confirmar
router.patch('/:id/confirmar', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE escalas SET confirmado = true, confirmado_em = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Entrada de escala não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/escalas/:id
router.delete('/:id', liderOuAdminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM escalas WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Removido da escala' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
