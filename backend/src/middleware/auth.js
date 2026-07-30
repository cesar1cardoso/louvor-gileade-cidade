const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// Apenas administradores
function adminMiddleware(req, res, next) {
  if (!req.usuario || req.usuario.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

// Líderes e administradores
function liderOuAdminMiddleware(req, res, next) {
  const role = req.usuario?.role;
  if (role !== 'admin' && role !== 'lider') {
    return res.status(403).json({ erro: 'Acesso restrito a líderes e administradores' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, liderOuAdminMiddleware };
