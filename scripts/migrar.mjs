// Cria e atualiza as tabelas no Neon: roda banco/000_base.sql e depois banco/migracoes/*.sql, cada um uma única vez.
// Uso: node --env-file=.env.local scripts/migrar.mjs   (precisa de DATABASE_URL; Node 22 ou mais novo)
import { readdirSync, readFileSync } from 'node:fs';
import { Client } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL. Rode "vercel env pull .env.local" depois de ligar o Neon ao projeto.');
  process.exit(1);
}

const raiz = new URL('../banco/', import.meta.url);
const arquivos = [
  '000_base.sql',
  ...readdirSync(new URL('migracoes/', raiz)).filter((f) => f.endsWith('.sql')).sort().map((f) => `migracoes/${f}`),
];

const client = new Client(url);
await client.connect();
try {
  await client.query('create table if not exists public._migracoes (nome text primary key, aplicada_em timestamptz not null default now())');
  const feitas = new Set((await client.query('select nome from public._migracoes')).rows.map((r) => r.nome));
  for (const arquivo of arquivos) {
    if (feitas.has(arquivo)) { console.log(`já aplicada  ${arquivo}`); continue; }
    await client.query('begin');
    try {
      await client.query(readFileSync(new URL(arquivo, raiz), 'utf8'));
      await client.query('insert into public._migracoes (nome) values ($1)', [arquivo]);
      await client.query('commit');
      console.log(`aplicada     ${arquivo}`);
    } catch (e) {
      await client.query('rollback');
      console.error(`ERRO em ${arquivo}: ${e.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
