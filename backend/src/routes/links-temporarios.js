const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, liderOuAdminMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// POST /api/links-temporarios — requer auth
router.post('/', authMiddleware, liderOuAdminMiddleware, async (req, res) => {
  const { culto_id, descricao } = req.body;
  if (!culto_id) return res.status(400).json({ erro: 'culto_id é obrigatório' });

  try {
    const cultoResult = await pool.query('SELECT * FROM cultos WHERE id = $1', [culto_id]);
    if (cultoResult.rows.length === 0) return res.status(404).json({ erro: 'Culto não encontrado' });
    const culto = cultoResult.rows[0];

    const token = uuidv4().replace(/-/g, '');
    // pg retorna TIMESTAMP WITHOUT TZ como objeto Date com componentes UTC
    // iguais à hora local de Brasília armazenada (pois Render roda em UTC).
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
      [token, culto_id, descricao || null, expiraEm]
    );

    const url = `${process.env.BASE_URL}/culto/${token}`;
    res.status(201).json({ ...result.rows[0], url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/links-temporarios/validar/:token — público
router.get('/validar/:token', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lt.*, c.nome AS culto_nome, c.data_hora, c.local
       FROM links_temporarios lt
       JOIN cultos c ON c.id = lt.culto_id
       WHERE lt.token = $1 AND lt.expira_em > NOW()`,
      [req.params.token]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Link inválido ou expirado' });

    await pool.query('UPDATE links_temporarios SET acessos = acessos + 1 WHERE token = $1', [req.params.token]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// DELETE /api/links-temporarios/:id
router.delete('/:id', authMiddleware, liderOuAdminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM links_temporarios WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Link revogado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/links-temporarios/culto/:cultoId
router.get('/culto/:cultoId', authMiddleware, async (req, res) => {
  const baseUrl = process.env.BASE_URL;
  try {
    const result = await pool.query(
      `SELECT lt.*
       FROM links_temporarios lt
       WHERE lt.culto_id = $1 AND lt.expira_em > NOW()
       ORDER BY lt.criado_em DESC`,
      [req.params.cultoId]
    );
    const rows = result.rows.map(r => ({ ...r, url: `${baseUrl}/culto/${r.token}` }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
