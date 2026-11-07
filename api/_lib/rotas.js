import { cadastrar, entrar, perfilDe } from './contas.js';
import { ErroDeUso, operar } from './operacoes.js';
import { cookieDeSessao, cookieEncerrado, uidDoCookie } from './sessao.js';

// Erros que o banco levanta de propósito (raise exception, restrições) têm mensagem escrita para a pessoa; o resto não vaza.
const CODIGO_VISIVEL = /^(P0|28|23)/;

function resposta(status, corpo, cookie) {
  return { status, corpo, cookie };
}

function falha(e) {
  if (e instanceof ErroDeUso) return resposta(e.status, { erro: e.message });
  if (CODIGO_VISIVEL.test(String(e?.code ?? ''))) return resposta(400, { erro: e.message.replace(/^error:\s*/i, '') });
  console.error(e);
  return resposta(500, { erro: 'Erro no servidor. Tente de novo em instantes.' });
}

/** Só aceita POST com o cabeçalho próprio: um formulário de outro site não consegue enviá-lo. */
function confere({ metodo, cabecalhos }) {
  if (metodo !== 'POST') throw new ErroDeUso('Método não permitido.', 405);
  if (cabecalhos['x-gogreen'] !== '1') throw new ErroDeUso('Requisição recusada.', 403);
}

const origemDe = (cabecalhos) => String(cabecalhos['x-forwarded-for'] ?? '').split(',')[0].trim();

/** POST /api/db: { op, ... } com a sessão do cookie. */
export async function tratarDb(req) {
  try {
    confere(req);
    const uid = uidDoCookie(req.cabecalhos.cookie);
    const dados = await operar(uid, req.corpo ?? {});
    // Apagar a conta encerra a sessão junto.
    const apagou = req.corpo?.op === 'rpc' && req.corpo?.fn === 'delete_my_account';
    return resposta(200, { dados }, apagou ? cookieEncerrado() : undefined);
  } catch (e) { return falha(e); }
}

/** POST /api/auth: { acao: 'cadastro' | 'entrar' | 'sair' | 'eu', ... }. */
export async function tratarAuth(req) {
  try {
    confere(req);
    const corpo = req.corpo ?? {};
    if (corpo.acao === 'cadastro') {
      const uid = await cadastrar(corpo);
      return resposta(200, { usuario: await perfilDe(uid) }, cookieDeSessao(uid));
    }
    if (corpo.acao === 'entrar') {
      const uid = await entrar(corpo, origemDe(req.cabecalhos));
      return resposta(200, { usuario: await perfilDe(uid) }, cookieDeSessao(uid));
    }
    if (corpo.acao === 'sair') return resposta(200, { usuario: null }, cookieEncerrado());
    if (corpo.acao === 'eu') {
      const uid = uidDoCookie(req.cabecalhos.cookie);
      const usuario = uid ? await perfilDe(uid) : null;
      return resposta(200, { usuario }, uid && !usuario ? cookieEncerrado() : undefined);
    }
    throw new ErroDeUso('Ação desconhecida.', 404);
  } catch (e) { return falha(e); }
}

/** Liga a função pura acima ao objeto de resposta do Vercel. */
export async function responder(tratar, req, res) {
  const { status, corpo, cookie } = await tratar({ metodo: req.method, cabecalhos: req.headers, corpo: req.body });
  if (cookie) res.setHeader('Set-Cookie', cookie);
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(corpo);
}
