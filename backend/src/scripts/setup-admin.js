require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function perguntar(pergunta) {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('=== Setup do Administrador — Louvor Casa Viva ===\n');
  }

  const nome = await perguntar('Nome do administrador: ');
  const email = await perguntar('E-mail: ');
  const senha = await perguntar('Senha: ');

  if (!nome || !email || !senha) {
    console.error('Todos os campos são obrigatórios.');
    process.exit(1);
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role)
       VALUES ($1,$2,$3,'admin')
       ON CONFLICT (email) DO UPDATE SET nome=$1, senha_hash=$3, role='admin', ativo=true
       RETURNING id, nome, email, role`,
      [nome, email, senhaHash]
    );
    if (process.env.NODE_ENV !== 'production') {
      console.log('\nAdministrador criado/atualizado com sucesso:');
      console.log(result.rows[0]);
    }
  } catch (err) {
    console.error('Erro ao criar administrador:', err.message);
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
