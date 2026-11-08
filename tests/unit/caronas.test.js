import test from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl } from '../../src/features/caronas/regras.js';
import { normalize } from '../../src/shared/texto.js';

test('busca ignora acento e maiúscula', () => assert.equal(normalize(' ARAÇATUBA '), 'aracatuba'));

test('link do WhatsApp recebe o código do Brasil', () => {
  assert.equal(whatsappUrl('18 99999-0000'), 'https://wa.me/5518999990000');
  assert.equal(whatsappUrl('5518999990000'), 'https://wa.me/5518999990000');
});

import { dayLabel, formatDays, isClosed, messagesHtml, sortRequests } from '../../src/features/caronas/regras.js';

test('dias da semana em texto curto', () => {
  assert.equal(formatDays([1, 2, 3, 4, 5]), 'seg a sex');
  assert.equal(formatDays([5, 3, 1]), 'seg, qua, sex');
  assert.equal(formatDays([6, 0]), 'fim de semana');
  assert.equal(formatDays([0, 1, 2, 3, 4, 5, 6]), 'todos os dias');
  assert.equal(formatDays([2, 2, 4]), 'ter, qui');
});

test('pedidos: o que espera resposta vem primeiro, depois aceitos, e os encerrados por último; mais novos antes', () => {
  const r = (id, status, created_at) => ({ id, status, created_at });
  const lista = sortRequests([r('a', 'cancelada', '2026-11-07T10:00:00Z'), r('b', 'aceita', '2026-11-07T09:00:00Z'), r('c', 'pendente', '2026-11-06T09:00:00Z'), r('d', 'pendente', '2026-11-07T08:00:00Z'), r('e', 'recusada', '2026-11-07T11:00:00Z')]);
  assert.deepEqual(lista.map((x) => x.id), ['d', 'c', 'b', 'e', 'a']);
  assert.deepEqual([r('x', 'recusada'), r('y', 'cancelada'), r('z', 'pendente'), r('w', 'aceita')].map(isClosed), [true, true, false, false]);
});

test('data das mensagens: hoje, ontem ou dia/mês, no horário de Araçatuba', () => {
  const agora = new Date('2026-11-07T15:00:00Z');
  assert.equal(dayLabel('2026-11-07T12:00:00Z', agora), 'Hoje');
  assert.equal(dayLabel('2026-11-06T18:00:00Z', agora), 'Ontem');
  assert.equal(dayLabel('2026-11-01T18:00:00Z', agora), '01/11');
  // 01h UTC ainda é a noite do dia anterior em Araçatuba (UTC-3)
  assert.equal(dayLabel('2026-11-07T01:00:00Z', new Date('2026-11-07T15:00:00Z')), 'Ontem');
});

test('chat: separador de dia só quando o dia muda, e texto da pessoa é escapado', () => {
  const agora = new Date('2026-11-07T15:00:00Z');
  const m = (created_at, body, mine = false) => ({ created_at, body, mine, autor: 'Ana' });
  const html = messagesHtml([m('2026-11-06T18:00:00Z', 'oi'), m('2026-11-06T19:00:00Z', 'tudo bem?', true), m('2026-11-07T12:00:00Z', '<b>bom dia</b>')], agora);
  assert.equal((html.match(/chat__dia/g) ?? []).length, 2);
  assert.ok(html.indexOf('Ontem') < html.indexOf('Hoje'));
  assert.ok(!html.includes('<b>bom dia</b>') && html.includes('&lt;b&gt;'));
  assert.match(messagesHtml([], agora), /Ninguém escreveu ainda/);
});
