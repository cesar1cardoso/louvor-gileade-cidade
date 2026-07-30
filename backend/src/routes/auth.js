const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

function gerarAccessToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  );
}

function gerarRefreshToken(usuario) {
  return jwt.sign(
    { id: usuario.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND ativo = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const usuario = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const accessToken = gerarAccessToken(usuario);
    const refreshToken = gerarRefreshToken(usuario);

    await pool.query('UPDATE usuarios SET refresh_token = $1 WHERE id = $2', [refreshToken, usuario.id]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ erro: 'Refresh token não fornecido' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1 AND refresh_token = $2 AND ativo = true',
      [payload.id, token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Refresh token inválido' });
    }

    const usuario = result.rows[0];
    const accessToken = gerarAccessToken(usuario);
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ erro: 'Refresh token inválido ou expirado' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await pool.query('UPDATE usuarios SET refresh_token = NULL WHERE id = $1', [payload.id]);
    } catch (_) {}
  }
  res.clearCookie('refreshToken');
  return res.json({ mensagem: 'Logout realizado' });
});

module.exports = router;
