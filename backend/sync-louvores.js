/**
 * Script para sincronizar (merge/upsert) a tabela "louvores"
 * da base de PRODUÇÃO para a base de TESTE (branch teste-louvores no Neon).
 *
 * Como funciona:
 * - Lê todas as linhas de "louvores" na produção
 * - Para cada uma, faz INSERT ... ON CONFLICT (id) DO UPDATE na base de teste
 *   -> se o louvor já existe na base de teste (mesmo id), ele é ATUALIZADO
 *   -> se não existe, é INSERIDO
 * - Louvores que existem só na base de teste (criados lá manualmente, se houver)
 *   NÃO são apagados nem afetados.
 *
 * Requisitos:
 * - Rodar de dentro da pasta "backend" do projeto (onde o pacote "pg" já está instalado)
 * - Definir as variáveis de ambiente PROD_DATABASE_URL e TEST_DATABASE_URL antes de rodar
 */

const { Client } = require('pg');

const PROD_URL = process.env.PROD_DATABASE_URL;
const TEST_URL = process.env.TEST_DATABASE_URL;

if (!PROD_URL || !TEST_URL) {
  console.error('Defina as variáveis PROD_DATABASE_URL e TEST_DATABASE_URL antes de rodar.');
  process.exit(1);
}

async function main() {
  const prod = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  const test = new Client({ connectionString: TEST_URL, ssl: { rejectUnauthorized: false } });

  await prod.connect();
  await test.connect();

  console.log('Conectado às duas bases. Buscando louvores da produção...');

  const { rows } = await prod.query('SELECT * FROM louvores');
  console.log(`Encontrados ${rows.length} louvores na produção.`);

  if (rows.length === 0) {
    console.log('Nada para sincronizar.');
    await prod.end();
    await test.end();
    return;
  }

  // Descobre colunas geradas automaticamente pelo banco (ex: busca_fts),
  // que não podem receber valor manual no INSERT/UPDATE.
  const generatedColsResult = await test.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'louvores' AND is_generated = 'ALWAYS'
  `);
  const generatedCols = new Set(generatedColsResult.rows.map((r) => r.column_name));
  if (generatedCols.size > 0) {
    console.log('Ignorando colunas geradas automaticamente:', [...generatedCols].join(', '));
  }

  const columns = Object.keys(rows[0]).filter((c) => !generatedCols.has(c));
  const updateSet = columns
    .filter((c) => c !== 'id')
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const columnList = columns.map((c) => `"${c}"`).join(', ');

  const query = `
    INSERT INTO louvores (${columnList})
    VALUES (${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${updateSet}
  `;

  let inseridosOuAtualizados = 0;

  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    await test.query(query, values);
    inseridosOuAtualizados++;
  }

  console.log(`Sincronização concluída! ${inseridosOuAtualizados} louvores inseridos/atualizados na base de teste.`);

  await prod.end();
  await test.end();
}

main().catch((err) => {
  console.error('Erro durante a sincronização:', err.message);
  process.exit(1);
});
