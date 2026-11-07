import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOverpass, loadBusStops } from '../../src/servicos/pontos-onibus.js';

test('parseOverpass lê pontos em [lat, lng] e descarta os sem coordenada', () => {
  const json = { elements: [
    { type: 'node', id: 1, lat: -21.2, lon: -50.43, tags: { name: 'Terminal' } },
    { type: 'node', id: 2, lat: -21.21, lon: -50.44, tags: {} },
    { type: 'node', id: 3, tags: { name: 'Sem posição' } },
  ] };
  assert.deepEqual(parseOverpass(json), [
    { id: 1, coords: [-21.2, -50.43], nome: 'Terminal' },
    { id: 2, coords: [-21.21, -50.44], nome: null },
  ]);
});

test('parseOverpass com resposta vazia ou torta devolve lista vazia', () => {
  assert.deepEqual(parseOverpass({}), []);
  assert.deepEqual(parseOverpass(null), []);
});

test('loadBusStops devolve lista vazia se o arquivo não carregar', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try { assert.deepEqual(await loadBusStops(), []); } finally { globalThis.fetch = real; }
});
