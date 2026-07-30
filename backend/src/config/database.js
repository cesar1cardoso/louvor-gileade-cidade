const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'louvor_casaviva',
  user: process.env.DB_USER || 'louvor_user',
  password: process.env.DB_PASSWORD || 'louvor_senha_2024',
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL', err);
});

module.exports = pool;
