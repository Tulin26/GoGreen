import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { usarExecutor } from '../../api/_lib/banco.js';
import { tratarAuth, tratarDb } from '../../api/_lib/rotas.js';

process.env.AUTH_SECRET ??= 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';

const lerSql = (caminho) => readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8');

/** Banco de teste: a base do Neon e todas as migrações, em PGlite, ligado ao servidor no lugar do Neon. */
export async function bancoDeTeste() {
  const db = new PGlite();
  await db.exec(lerSql('banco/000_base.sql'));
  for (const n of ['001_init', '002_carros_e_caronas', '003_usuario', '004_transportes_e_eletricos', '005_trajetos', '006_chat_carona', '007_foco_carona', '008_motos_caronas', '009_apagar_veiculo_e_rotas', '010_apagar_conta', '011_mais_motoristas', '012_tipo_no_cadastro', '013_caronas_para_visitantes', '014_limite_de_motoristas']) {
    await db.exec(lerSql(`banco/migracoes/${n}.sql`));
  }
  usarExecutor(({ uid, papel, consultas }) => db.transaction(async (tx) => {
    await tx.query("select set_config('request.uid', $1, true)", [uid ?? '']);
    if (papel) await tx.exec(`set local role ${papel}`);
    const saida = [];
    for (const c of consultas) saida.push((await tx.query(c.texto, c.params ?? [])).rows);
    return saida;
  }));
  return db;
}

/** Um navegador de mentira: fala com o servidor direto e guarda o cookie de sessão, como o de verdade. */
export function navegador(extra = {}) {
  let cookie = '';
  const fetchFn = async (url, init) => {
    const tratar = url === '/api/db' ? tratarDb : tratarAuth;
    const r = await tratar({ metodo: init.method, cabecalhos: { ...init.headers, ...extra, cookie }, corpo: JSON.parse(init.body) });
    if (r.cookie) { const par = r.cookie.split(';')[0]; cookie = par.endsWith('=') ? '' : par; }
    return { ok: r.status < 400, status: r.status, json: async () => r.corpo };
  };
  return { fetchFn, cookie: () => cookie, adulterar: () => { cookie = cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')); } };
}
