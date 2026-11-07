// Acesso ao Neon. Cada chamada vira UMA transação: grava quem está agindo em request.uid, troca para o papel
// (authenticated/anon) para valer as regras de linha (RLS) e as permissões das migrações, e roda as consultas.
const PAPEIS = new Set(['authenticated', 'anon']);

async function pelaNeon({ uid, papel, consultas }) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const antes = papel ? 2 : 1;
  const resultados = await sql.transaction((t) => [
    t.query("select set_config('request.uid', $1, true)", [uid ?? '']),
    ...(papel ? [t.query(`set local role ${papel}`)] : []),
    ...consultas.map((c) => t.query(c.texto, c.params ?? [])),
  ]);
  return resultados.slice(antes);
}

let executor = pelaNeon;

/** Só para testes: troca o Neon por outro banco (PGlite) sem mudar nada no resto. */
export function usarExecutor(fn) { executor = fn ?? pelaNeon; }

/**
 * papel: 'authenticated' ou 'anon' (com as regras do banco) ou null (dono, só para o login e a criação de conta).
 * consultas: [{ texto, params }]. Devolve uma lista de linhas por consulta.
 */
export function executar({ uid = null, papel, consultas }) {
  if (papel !== null && !PAPEIS.has(papel)) throw new Error('Papel inválido.');
  return executor({ uid, papel, consultas });
}
