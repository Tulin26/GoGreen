import { executar } from './banco.js';

const COLUNAS_CARRO = 'id, tipo, marca, modelo, versao, ano, placa, combustivel, km_l_gasolina, km_l_etanol, km_l_diesel, co2_g_km_gasolina, co2_g_km_etanol, co2_g_km_diesel, kwh_km, origem_consumo';
const COLUNAS_PERFIL = ['apelido', 'usuario', 'telefone', 'transportes'];
const NOME_FUNCAO = /^[a-z][a-z0-9_]*$/;
const NOME_ARGUMENTO = /^p_[a-z0-9_]+$/;
const NOME_COLUNA = /^[a-z][a-z0-9_]*$/;
const CASTS = { p_dias: '::smallint[]' };
// Usadas só pelo servidor, no cadastro e no login. Nunca ficam abertas ao navegador.
const SO_SERVIDOR = new Set(['email_do_usuario', 'usuario_disponivel']);
// Funções que visitantes sem conta podem chamar. Todas as outras exigem login (o banco também recusa, mas aqui a resposta é clara).
const PUBLICAS = new Set(['ranking_turmas', 'match_daily_rides']);

export class ErroDeUso extends Error {
  constructor(mensagem, status = 400) { super(mensagem); this.status = status; }
}

const papelDe = (uid) => (uid ? 'authenticated' : 'anon');

function exigeLogin(uid) {
  if (!uid) throw new ErroDeUso('Entre na sua conta para continuar.', 401);
}

const primitivo = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);

/** Valor de um argumento: texto, número, booleano, nulo, ou lista simples (vira array do Postgres). */
function valor(v) {
  if (Array.isArray(v)) {
    if (!v.every((x) => typeof x === 'number' || typeof x === 'string')) throw new ErroDeUso('Argumento inválido.');
    return `{${v.map((x) => (typeof x === 'number' ? x : `"${String(x).replace(/(["\\])/g, '\\$1')}"`)).join(',')}}`;
  }
  if (!primitivo(v)) throw new ErroDeUso('Argumento inválido.');
  return v;
}

/** Função do banco chamada pelo nome. Se só volta uma coluna com o nome da função, é um valor; senão, uma lista de linhas. */
async function chamarFuncao(uid, fn, args = {}) {
  if (!NOME_FUNCAO.test(fn) || SO_SERVIDOR.has(fn)) throw new ErroDeUso('Função desconhecida.', 404);
  const nomes = Object.keys(args);
  if (!nomes.every((n) => NOME_ARGUMENTO.test(n))) throw new ErroDeUso('Argumento inválido.');
  if (!uid && !PUBLICAS.has(fn)) throw new ErroDeUso('Entre na sua conta para continuar.', 401);
  const texto = `select * from public.${fn}(${nomes.map((n, i) => `${n} => $${i + 1}${CASTS[n] ?? ''}`).join(', ')})`;
  const [linhas] = await executar({ uid, papel: papelDe(uid), consultas: [{ texto, params: nomes.map((n) => valor(args[n])) }] });
  const unico = linhas.length === 1 && Object.keys(linhas[0]).length === 1 && fn in linhas[0];
  return unico ? linhas[0][fn] : linhas;
}

const OPERACOES = {
  async rpc(uid, { fn, args }) {
    return chamarFuncao(uid, String(fn), args ?? {});
  },

  async listCars(uid) {
    exigeLogin(uid);
    const [linhas] = await executar({ uid, papel: 'authenticated', consultas: [{ texto: `select ${COLUNAS_CARRO} from public.user_cars order by created_at` }] });
    return linhas;
  },

  // As colunas que a pessoa pode gravar são só as que o banco libera (grant por coluna); o resto o banco recusa.
  async addCar(uid, { car }) {
    exigeLogin(uid);
    const colunas = Object.keys(car ?? {});
    if (!colunas.length || !colunas.every((c) => NOME_COLUNA.test(c)) || !Object.values(car).every(primitivo)) throw new ErroDeUso('Dados do veículo inválidos.');
    const texto = `insert into public.user_cars (${colunas.join(', ')}) values (${colunas.map((_, i) => `$${i + 1}`).join(', ')}) returning ${COLUNAS_CARRO}`;
    const [linhas] = await executar({ uid, papel: 'authenticated', consultas: [{ texto, params: colunas.map((c) => car[c]) }] });
    return linhas[0];
  },

  async listPositions(uid, { desde }) {
    const texto = 'select token, line_code, direction, lat, lng, recorded_at from public.bus_positions where recorded_at > $1 order by recorded_at desc limit 200';
    const [linhas] = await executar({ uid, papel: papelDe(uid), consultas: [{ texto, params: [String(desde)] }] });
    return linhas;
  },

  async updateProfile(uid, { perfil }) {
    exigeLogin(uid);
    const colunas = COLUNAS_PERFIL.filter((c) => c in (perfil ?? {}));
    if (!colunas.length) return null;
    const params = colunas.map((c) => (c === 'transportes' ? valor(perfil[c] ?? []) : perfil[c] ?? null));
    const sets = colunas.map((c, i) => `${c} = $${i + 1}${c === 'transportes' ? '::text[]' : ''}`).join(', ');
    try {
      await executar({ uid, papel: 'authenticated', consultas: [{ texto: `update public.profiles set ${sets} where id = auth.uid()`, params }] });
    } catch (e) {
      if (e?.code === '23505') throw new ErroDeUso('Esse usuário já existe. Escolha outro.');
      throw e;
    }
    return null;
  },
};

export async function operar(uid, { op, ...argumentos }) {
  const fazer = OPERACOES[op];
  if (!fazer) throw new ErroDeUso('Operação desconhecida.', 404);
  return fazer(uid, argumentos);
}
