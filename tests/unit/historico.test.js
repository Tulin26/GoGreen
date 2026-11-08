import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_HISTORICO, addToHistory } from '../../src/features/rotas/historico.js';

const lugar = (n, extra = {}) => ({ title: `Lugar ${n}`, subtitle: 'Araçatuba', point: [-21.2 - n / 1000, -50.43], ...extra });

test('o lugar mais novo vai para o topo', () => {
  const lista = addToHistory(addToHistory([], lugar(1)), lugar(2));
  assert.deepEqual(lista.map((l) => l.title), ['Lugar 2', 'Lugar 1']);
});

test('o mesmo lugar não repete: sobe para o topo', () => {
  const lista = addToHistory(addToHistory(addToHistory([], lugar(1)), lugar(2)), lugar(1));
  assert.deepEqual(lista.map((l) => l.title), ['Lugar 1', 'Lugar 2']);
});

test('mesmo nome em outro ponto da cidade conta como outro lugar', () => {
  const lista = addToHistory(addToHistory([], lugar(1)), { ...lugar(1), point: [-21.25, -50.5] });
  assert.equal(lista.length, 2);
});

test('guarda só os últimos MAX_HISTORICO', () => {
  let lista = [];
  for (let n = 1; n <= MAX_HISTORICO + 4; n++) lista = addToHistory(lista, lugar(n));
  assert.equal(lista.length, MAX_HISTORICO);
  assert.equal(lista[0].title, `Lugar ${MAX_HISTORICO + 4}`);
});

test('lugar sem nome ou sem ponto válido é ignorado', () => {
  assert.deepEqual(addToHistory([], { title: 'Sem ponto' }), []);
  assert.deepEqual(addToHistory([], { title: 'Ponto torto', point: [NaN, 1] }), []);
  assert.deepEqual(addToHistory([], null), []);
});
