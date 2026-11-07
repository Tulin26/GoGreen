import test from 'node:test';
import assert from 'node:assert/strict';
import { criarToken, lerToken, uidDoCookie } from '../../api/_lib/sessao.js';
import { conferirSenha, criarHash } from '../../api/_lib/senha.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
process.env.AUTH_SECRET = SEGREDO;
const UID = '11111111-1111-1111-1111-111111111111';

test('token assinado volta com o mesmo id', () => assert.equal(lerToken(criarToken(UID)), UID));

test('token adulterado, vencido ou sem assinatura é recusado', () => {
  const [corpo] = criarToken(UID).split('.');
  assert.equal(lerToken(`${corpo}.assinatura-falsa`), null);
  assert.equal(lerToken(corpo), null);
  assert.equal(lerToken(criarToken(UID, Date.now() - 31 * 86400000)), null);
  assert.equal(lerToken(''), null);
  assert.equal(lerToken(undefined), null);
});

test('token de outro segredo não vale', () => {
  const token = criarToken(UID);
  process.env.AUTH_SECRET = 'outro-segredo-completamente-diferente-do-primeiro';
  assert.equal(lerToken(token), null);
  process.env.AUTH_SECRET = SEGREDO;
});

test('o cookie certo é achado entre vários', () => {
  assert.equal(uidDoCookie(`a=1; gogreen_sessao=${criarToken(UID)}; b=2`), UID);
  assert.equal(uidDoCookie('a=1'), null);
});

test('sem AUTH_SECRET forte o servidor não cria sessão', () => {
  process.env.AUTH_SECRET = 'curto';
  assert.throws(() => criarToken(UID), /AUTH_SECRET/);
  process.env.AUTH_SECRET = SEGREDO;
});

test('senha: hash diferente a cada vez, confere a certa e recusa a errada', async () => {
  const a = await criarHash('senha123');
  const b = await criarHash('senha123');
  assert.notEqual(a, b);
  assert.ok(await conferirSenha('senha123', a));
  assert.equal(await conferirSenha('senha124', a), false);
  assert.equal(await conferirSenha('senha123', null), false);
  assert.equal(await conferirSenha('senha123', 'texto-solto'), false);
});
