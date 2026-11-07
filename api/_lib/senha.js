import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt);
const TAMANHO = 64;

/** "scrypt:<sal>:<hash>", ambos em hexadecimal. O sal é sorteado a cada senha. */
export async function criarHash(senha) {
  const sal = randomBytes(16);
  return `scrypt:${sal.toString('hex')}:${(await derivar(senha, sal, TAMANHO)).toString('hex')}`;
}

export async function conferirSenha(senha, guardado) {
  const [tipo, sal, hash] = String(guardado ?? '').split(':');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const atual = await derivar(senha, Buffer.from(sal, 'hex'), esperado.length);
  return atual.length === esperado.length && timingSafeEqual(atual, esperado);
}
