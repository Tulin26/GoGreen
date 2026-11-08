import test from 'node:test';
import assert from 'node:assert/strict';
import { countText, filterLines } from '../../src/features/onibus/escolha.js';

const LINHAS = [
  { code: '103', name: 'Claudionor Cinti via Cussy' },
  { code: '104', name: 'São José' },
  { code: '121', name: 'Águas Claras / Rosele / Verde Parque' },
];

test('sem texto, todas as linhas', () => assert.equal(filterLines(LINHAS, '').length, 3));

test('filtra pelo número da linha', () => assert.deepEqual(filterLines(LINHAS, '104').map((l) => l.code), ['104']));

test('filtra pelo nome, sem diferenciar acento nem maiúscula', () => {
  assert.deepEqual(filterLines(LINHAS, 'sao jose').map((l) => l.code), ['104']);
  assert.deepEqual(filterLines(LINHAS, 'AGUAS').map((l) => l.code), ['121']);
  assert.deepEqual(filterLines(LINHAS, 'cinti').map((l) => l.code), ['103']);
});

test('texto sem resultado devolve lista vazia, e a contagem fala português', () => {
  assert.deepEqual(filterLines(LINHAS, 'zzz'), []);
  assert.deepEqual([countText(0), countText(1), countText(3)], ['Nenhuma linha encontrada', '1 linha', '3 linhas']);
  assert.equal(filterLines(LINHAS, undefined).length, 3);
});
