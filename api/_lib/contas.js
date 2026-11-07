import { executar } from './banco.js';
import { ErroDeUso } from './operacoes.js';
import { conferirSenha, criarHash } from './senha.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FALHAS = 8;
const JANELA = '15 minutes';
// Hash de uma senha qualquer: conferido quando o e-mail não existe, para o tempo de resposta não revelar quem tem conta.
const HASH_FALSO = 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64);

const dono = (consultas) => executar({ papel: null, consultas });

export const normalizaEmail = (e) => String(e ?? '').trim().toLowerCase();

async function comoUsuario(texto, params) {
  const [linhas] = await executar({ uid: null, papel: 'anon', consultas: [{ texto, params }] });
  return linhas[0] ? Object.values(linhas[0])[0] : null;
}

/** Cria a conta (o gatilho do banco cria o perfil e o veículo) e devolve o id. */
export async function cadastrar({ email, password, apelido, usuario, telefone, transportes, carro }) {
  const mail = normalizaEmail(email);
  if (!EMAIL.test(mail)) throw new ErroDeUso('Digite um e-mail válido.');
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) throw new ErroDeUso('Use uma senha com 6 a 72 caracteres.');
  if (usuario && !(await comoUsuario('select public.usuario_disponivel($1)', [usuario]))) throw new ErroDeUso('Esse usuário já existe. Escolha outro.');
  const meta = JSON.stringify({ apelido, usuario, telefone, transportes, carro });
  try {
    const [linhas] = await dono([{ texto: 'insert into auth.users (email, senha_hash, raw_user_meta_data) values ($1, $2, $3::jsonb) returning id', params: [mail, await criarHash(password), meta] }]);
    return linhas[0].id;
  } catch (e) {
    if (e?.code === '23505') throw new ErroDeUso('Já existe uma conta com este e-mail.');
    throw e;
  }
}

/** Confere e-mail (ou usuário) e senha. Depois de muitas falhas seguidas, bloqueia por um tempo. */
export async function entrar({ login, password }, origem = '') {
  const texto = String(login ?? '').trim();
  if (!texto || typeof password !== 'string') throw new ErroDeUso('E-mail, usuário ou senha incorretos.', 401);
  const email = texto.includes('@') ? normalizaEmail(texto) : await comoUsuario('select public.email_do_usuario($1)', [texto.toLowerCase()]);
  const chave = `${email ?? texto.toLowerCase()}|${origem}`;
  const [[{ falhas }]] = await dono([{ texto: `select count(*)::int as falhas from auth.tentativas where chave = $1 and em > now() - interval '${JANELA}'`, params: [chave] }]);
  if (falhas >= MAX_FALHAS) throw new ErroDeUso('Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.', 429);
  const [linhas] = await dono([{ texto: 'select id, senha_hash from auth.users where email = $1', params: [email ?? ''] }]);
  const conta = linhas[0];
  if (!(await conferirSenha(password, conta?.senha_hash ?? HASH_FALSO)) || !conta) {
    await dono([{ texto: "delete from auth.tentativas where em < now() - interval '1 day'" }, { texto: 'insert into auth.tentativas (chave) values ($1)', params: [chave] }]);
    throw new ErroDeUso('E-mail, usuário ou senha incorretos.', 401);
  }
  await dono([{ texto: 'delete from auth.tentativas where chave = $1', params: [chave] }]);
  return conta.id;
}

/** Perfil de quem está logado, ou null se a conta não existe mais. */
export async function perfilDe(uid) {
  const [[conta], [perfil]] = await executar({
    uid, papel: null,
    consultas: [
      { texto: 'select email from auth.users where id = $1', params: [uid] },
      { texto: 'select apelido, usuario, telefone, transportes, is_admin from public.profiles where id = $1', params: [uid] },
    ],
  });
  if (!conta) return null;
  return { id: uid, email: conta.email, apelido: perfil?.apelido ?? 'Morador', usuario: perfil?.usuario ?? null, telefone: perfil?.telefone ?? null, transportes: perfil?.transportes ?? [], is_admin: Boolean(perfil?.is_admin) };
}
