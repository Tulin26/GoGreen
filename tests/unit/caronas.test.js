import test from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl } from '../../src/features/caronas/regras.js';
import { normalize } from '../../src/shared/texto.js';

test('busca ignora acento e maiúscula', () => assert.equal(normalize(' ARAÇATUBA '), 'aracatuba'));

test('link do WhatsApp recebe o código do Brasil', () => {
  assert.equal(whatsappUrl('18 99999-0000'), 'https://wa.me/5518999990000');
  assert.equal(whatsappUrl('5518999990000'), 'https://wa.me/5518999990000');
});
