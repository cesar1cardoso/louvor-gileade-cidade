const bcrypt = require('bcrypt');
const pool = require('../config/database');

const ADMIN_EMAIL = 'admin@casaviva.com';
const ADMIN_SENHA = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2024';
const ADMIN_NOME  = 'Administrador';

async function autoSeed() {
  try {
    // ── Migrations ────────────────────────────────────────────────
    await pool.query(`
      ALTER TABLE escalas ADD COLUMN IF NOT EXISTS instrumento_override TEXT
    `);

    await pool.query(`
      ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check
    `);
    await pool.query(`
      ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
        CHECK (role IN ('admin', 'lider', 'membro'))
    `);

    // ── Seed: Sanfona ─────────────────────────────────────────────
    await pool.query(`
      INSERT INTO instrumentos (nome, icone) VALUES ('Sanfona', '🪗')
      ON CONFLICT (nome) DO NOTHING
    `);

    // ── Seed: Admin padrão ────────────────────────────────────────
    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE role = 'admin' LIMIT 1"
    );
    if (existe.rows.length > 0) return;

    const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN_NOME, ADMIN_EMAIL, senhaHash]
    );
    console.log('======================================');
    console.log('  Admin padrão criado com sucesso.');
    console.log('  Consulte o arquivo .env para as');
    console.log('  credenciais iniciais de acesso.');
    console.log('  Troque a senha após o primeiro login.');
    console.log('======================================');
  } catch (err) {
    console.error('Erro no auto-seed:', err.message);
  }
}

module.exports = autoSeed;
