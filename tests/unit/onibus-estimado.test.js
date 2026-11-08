import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBus } from '../../src/features/rotas/onibus-estimado.js';
import { busMinutes } from '../../src/features/rotas/recomendacao.js';

const at = (i, dLat = 0) => [-21.2 + dLat, -50.5 + i * 0.0045];
const straight = (dLat, km = 5) => ({ km, minutes: 10, geometry: Array.from({ length: 11 }, (_, i) => at(i, dLat)) });
const stop = (id, i, dLat = 0) => ({ id, coords: at(i, dLat), nome: null });
const from = at(0);
const to = at(10);

test('escolhe o caminho que passa por mais pontos', () => {
  const avenida = straight(0);
  const rua = straight(0.01);
  const stops = [stop(1, 1), stop(2, 3), stop(3, 6), stop(4, 9)];
  const r = planBus(from, to, stops, [rua, avenida]);
  assert.equal(r.geometry, avenida.geometry);
  assert.equal(r.stopsPassed.length, 4);
});

test('pontos passados vêm na ordem do caminho, embarque e desembarque nas pontas', () => {
  const stops = [stop(3, 9), stop(1, 1), stop(2, 3)];
  const r = planBus(from, to, stops, [straight(0)]);
  assert.deepEqual(r.stopsPassed.map((s) => s.id), [1, 2, 3]);
  assert.equal(r.board.id, 1);
  assert.equal(r.alight.id, 3);
});

test('sem pontos devolve estimativa marcada, sem embarque', () => {
  const r = planBus(from, to, [], [straight(0)]);
  assert.equal(r.board, null);
  assert.equal(r.alight, null);
  assert.deepEqual(r.stopsPassed, []);
  assert.equal(r.estimated, true);
});

test('ponto de embarque a mais de 800 m da origem é ignorado', () => {
  const r = planBus(from, to, [stop(1, 2), stop(2, 9)], [straight(0)]);
  assert.equal(r.board, null);
});

test('minutos seguem busMinutes e CO2 vem do ônibus', () => {
  const r = planBus(from, to, [stop(1, 0.5), stop(2, 9.5)], [straight(0, 5)]);
  assert.equal(r.minutes, busMinutes(5));
  assert.equal(r.co2, 19.5 * 5);
});

test('pontos fora do traçado ainda servem de embarque e desembarque se estão a até 800 m', () => {
  const off = (id, i) => stop(id, i, 300 / 111320);
  const r = planBus(from, to, [off(1, 0), off(2, 10)], [straight(0)]);
  assert.equal(r.board.id, 1);
  assert.equal(r.alight.id, 2);
  assert.equal(r.estimated, true);
});

test('o mesmo ponto não serve de embarque e desembarque', () => {
  const r = planBus(from, at(0.2), [stop(1, 0.1)], [straight(0)]);
  assert.equal(r.board, null);
});
