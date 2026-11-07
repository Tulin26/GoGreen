import { createHmac, timingSafeEqual } from 'node:crypto';

const NOME = 'gogreen_sessao';
const DIAS = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function segredo() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET ausente ou curto: use pelo menos 32 caracteres.');
  return s;
}

const assina = (corpo) => createHmac('sha256', segredo()).update(corpo).digest('base64url');

/** Token assinado { uid, exp }. Quem não tem o segredo não consegue forjar nem alterar. */
export function criarToken(uid, agora = Date.now()) {
  const corpo = Buffer.from(JSON.stringify({ uid, exp: agora + DIAS * 86400000 })).toString('base64url');
  return `${corpo}.${assina(corpo)}`;
}

/** Devolve o id da pessoa, ou null se o token for inválido, adulterado ou vencido. */
export function lerToken(token, agora = Date.now()) {
  const [corpo, assinatura] = String(token ?? '').split('.');
  if (!corpo || !assinatura) return null;
  const a = Buffer.from(assinatura);
  const b = Buffer.from(assina(corpo));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return exp > agora && UUID.test(uid) ? uid : null;
  } catch { return null; }
}

/** Lê a sessão do cabeçalho Cookie. */
export function uidDoCookie(cabecalho) {
  const par = String(cabecalho ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${NOME}=`));
  return par ? lerToken(par.slice(NOME.length + 1)) : null;
}

const atributos = (maxAge) => `HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${process.env.VERCEL ? '; Secure' : ''}`;
export const cookieDeSessao = (uid) => `${NOME}=${criarToken(uid)}; ${atributos(DIAS * 86400)}`;
export const cookieEncerrado = () => `${NOME}=; ${atributos(0)}`;
