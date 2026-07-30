const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/usuarios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, role, ativo, criado_em FROM usuarios ORDER BY nome'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
  const { nome, email, senha, role } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role)
       VALUES ($1,$2,$3,$4) RETURNING id, nome, email, role, ativo, criado_em`,
      [nome, email, senhaHash, role || 'membro']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ erro: 'E-mail já cadastrado' });
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PATCH /api/usuarios/:id
router.patch('/:id', async (req, res) => {
  const { nome, email, role, ativo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE usuarios SET
        nome  = COALESCE($1, nome),
        email = COALESCE($2, email),
        role  = COALESCE($3, role),
        ativo = COALESCE($4, ativo)
       WHERE id = $5 RETURNING id, nome, email, role, ativo, criado_em`,
      [nome, email, role, ativo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ erro: 'E-mail já cadastrado' });
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/usuarios/:id/reset-senha
router.post('/:id/reset-senha', async (req, res) => {
  const { senha } = req.body;
  if (!senha || senha.length < 4) {
    return res.status(400).json({ erro: 'Senha deve ter ao menos 4 caracteres' });
  }
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `UPDATE usuarios SET senha_hash = $1, refresh_token = NULL WHERE id = $2 RETURNING id`,
      [senhaHash, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Senha redefinida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
