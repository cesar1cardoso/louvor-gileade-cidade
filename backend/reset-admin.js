require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./src/config/database');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n=== Recuperação de acesso — Louvor Casa Viva ===\n');

  const email = await ask('E-mail do admin: ');
  const novaSenha = await ask('Nova senha: ');

  if (!email || !novaSenha) {
    console.error('E-mail e nova senha são obrigatórios.');
    process.exit(1);
  }
  if (novaSenha.length < 4) {
    console.error('Senha deve ter ao menos 4 caracteres.');
    process.exit(1);
  }

  try {
    const check = await pool.query(
      `SELECT id, nome, role FROM usuarios WHERE email = $1 AND ativo = true`,
      [email]
    );

    if (check.rows.length === 0) {
      console.error(`\nUsuário não encontrado ou inativo: ${email}`);
      process.exit(1);
    }

    const usuario = check.rows[0];
    if (usuario.role !== 'admin') {
      console.error(`\nUsuário "${usuario.nome}" não tem perfil admin (role: ${usuario.role}).`);
      process.exit(1);
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await pool.query(
      `UPDATE usuarios SET senha_hash = $1, refresh_token = NULL WHERE id = $2`,
      [senhaHash, usuario.id]
    );

    console.log(`\n✅ Senha de "${usuario.nome}" (${email}) redefinida com sucesso.\n`);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
