import test from 'node:test';
import assert from 'node:assert/strict';
import { demoStore } from '../../src/dados/demo/index.js';

const ctx = { origem: 'Terminal Urbano', destino: 'Fatec Araçatuba', outro: 'Carlos (exemplo)' };

test('chat demo: mensagem enviada aparece na conversa, e o motorista de exemplo responde', async () => {
  await demoStore.reset();
  await demoStore.signUp({ apelido: 'Teste' });
  await demoStore.sendChatMessage('exd-1', null, 'Quanto fica a carona?', ctx);
  const msgs = await demoStore.listChatMessages('exd-1', null);
  assert.equal(msgs[0].body, 'Quanto fica a carona?');
  assert.equal(msgs[0].mine, true);
  assert.equal(msgs[1].mine, false);
  assert.match(msgs[1].body, /R\$/);
});

test('chat demo: lista de conversas traz o outro lado e a última mensagem', async () => {
  const [c] = await demoStore.listChats();
  assert.equal(c.ride_id, 'exd-1');
  assert.equal(c.outro, 'Carlos (exemplo)');
  assert.equal(c.sou_motorista, false);
  assert.ok(c.ultima);
});

test('chat demo: mensagem vazia é recusada e exige conta', async () => {
  await assert.rejects(demoStore.sendChatMessage('exd-1', null, '   ', ctx), /Escreva/);
  await demoStore.reset();
  await assert.rejects(demoStore.sendChatMessage('exd-1', null, 'oi', ctx), /conta/i);
});
