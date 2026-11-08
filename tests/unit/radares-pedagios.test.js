import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descrever, loadRadaresPedagios, parseRadaresPedagios, velocidade } from '../../src/servicos/radares-pedagios.js';

test('parseRadaresPedagios separa radares e pedágios, com a velocidade do radar', () => {
  const json = { elements: [
    { type: 'node', id: 1, lat: -21.2, lon: -50.43, tags: { highway: 'speed_camera', maxspeed: '60' } },
    { type: 'node', id: 2, lat: -21.21, lon: -50.44, tags: { barrier: 'toll_booth', name: 'Praça de Araçatuba' } },
    { type: 'way', id: 3, center: { lat: -21.3, lon: -50.6 }, tags: { barrier: 'toll_booth' } },
    { type: 'node', id: 4, lat: -21.22, lon: -50.45, tags: { highway: 'toll_gantry' } },
  ] };
  assert.deepEqual(parseRadaresPedagios(json), [
    { id: 'node/1', tipo: 'radar', coords: [-21.2, -50.43], nome: null, velocidade: 60 },
    { id: 'node/2', tipo: 'pedagio', coords: [-21.21, -50.44], nome: 'Praça de Araçatuba', velocidade: null },
    { id: 'way/3', tipo: 'pedagio', coords: [-21.3, -50.6], nome: null, velocidade: null },
    { id: 'node/4', tipo: 'pedagio', coords: [-21.22, -50.45], nome: null, velocidade: null },
  ]);
});

test('parseRadaresPedagios descarta sem posição, sem etiqueta conhecida e repetidos', () => {
  const json = { elements: [
    { type: 'node', id: 1, tags: { highway: 'speed_camera' } },
    { type: 'node', id: 2, lat: -21.2, lon: -50.4, tags: { highway: 'bus_stop' } },
    { type: 'node', id: 3, lat: -21.2, lon: -50.4, tags: { highway: 'speed_camera' } },
    { type: 'node', id: 3, lat: -21.2, lon: -50.4, tags: { highway: 'speed_camera' } },
  ] };
  assert.equal(parseRadaresPedagios(json).length, 1);
  assert.deepEqual(parseRadaresPedagios({}), []);
  assert.deepEqual(parseRadaresPedagios(null), []);
});

test('velocidade lê "60" e "60 km/h" e ignora o que não é número', () => {
  assert.equal(velocidade({ maxspeed: '60' }), 60);
  assert.equal(velocidade({ maxspeed: '60 km/h' }), 60);
  assert.equal(velocidade({ maxspeed: 'signals' }), null);
  assert.equal(velocidade({}), null);
});

test('descrever mostra o limite do radar e o nome do pedágio', () => {
  assert.equal(descrever({ tipo: 'radar', velocidade: 50 }), 'Radar de velocidade: 50 km/h');
  assert.equal(descrever({ tipo: 'radar', velocidade: null }), 'Radar de velocidade');
  assert.equal(descrever({ tipo: 'pedagio', nome: 'Praça X' }), 'Pedágio: Praça X');
  assert.equal(descrever({ tipo: 'pedagio', nome: null }), 'Pedágio');
});

test('loadRadaresPedagios devolve lista vazia se o arquivo não carregar', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try { assert.deepEqual(await loadRadaresPedagios(), []); } finally { globalThis.fetch = real; }
});
