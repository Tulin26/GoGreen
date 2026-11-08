import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLegs } from '../../src/features/rotas/pernas.js';
import { haversine } from '../../src/shared/mapa/geometria.js';

const at = (i, dLat = 0) => [-21.2 + dLat, -50.5 + i * 0.0045];
const calls = [];
const route = async (mode, from, to) => { calls.push(mode); return { geometry: [from, to], km: haversine(from, to) / 1000, minutes: haversine(from, to) / 80 }; };
const trip = { from: at(0, 0.002), to: at(10, 0.002), hora: '07:00' };
const line = Array.from({ length: 11 }, (_, i) => at(i));

test('bicicleta de aluguel: a pé até a estação, pedala, e a pé até o destino', async () => {
  calls.length = 0;
  const o = { mode: 'bikeRental', detail: { from: { nome: 'Estação A', coords: at(0) }, to: { nome: 'Estação B', coords: at(10) } } };
  const r = await buildLegs(o, trip, route);
  assert.deepEqual(r.legs.map((l) => l.mode), ['foot', 'bike', 'foot']);
  assert.deepEqual(calls, ['foot', 'bike', 'foot']);
  assert.equal(r.steps.length, 3);
  assert.match(r.steps[0], /Estação A/);
  assert.deepEqual(r.markers.map((m) => m.label), ['Estação A', 'Estação B']);
});

test('carona: a pé até o motorista, de carro com ele, e a pé até o destino', async () => {
  calls.length = 0;
  const o = { mode: 'carpool', detail: { geometry: line, ride: { motorista: 'Carlos', hora: '07:05' }, boardPoint: at(1), alightPoint: at(9), meeting: 'Praça A', drop: 'Fatec' } };
  const r = await buildLegs(o, trip, route);
  assert.deepEqual(r.legs.map((l) => l.mode), ['foot', 'car', 'foot']);
  assert.ok(r.legs[1].geometry.length >= 2);
  assert.match(r.steps[0], /Praça A/);
  assert.match(r.steps[1], /Carlos/);
  assert.deepEqual(calls, ['foot', 'foot']);
});

test('ônibus: a pé até o ponto, ônibus entre os pontos, a pé até o destino', async () => {
  calls.length = 0;
  const board = { id: 1, coords: at(1) };
  const alight = { id: 2, coords: at(9) };
  const o = { mode: 'bus', detail: { geometry: line, board, alight, boardLabel: 'ponto A', alightLabel: 'ponto B', stopsPassed: [board, alight] } };
  const r = await buildLegs(o, trip, route);
  assert.deepEqual(r.legs.map((l) => l.mode), ['foot', 'bus', 'foot']);
  assert.match(r.steps[1], /ponto B/);
});

test('trecho a pé menor que 30 m é descartado', async () => {
  const o = { mode: 'bikeRental', detail: { from: { nome: 'A', coords: trip.from }, to: { nome: 'B', coords: trip.to } } };
  const r = await buildLegs(o, trip, route);
  assert.deepEqual(r.legs.map((l) => l.mode), ['bike']);
});

test('a pé, bicicleta e carro usam o caminho já calculado', async () => {
  calls.length = 0;
  const r = await buildLegs({ mode: 'foot', minutes: 10, km: 1, detail: { geometry: [trip.from, trip.to] } }, trip, route);
  assert.deepEqual(r.legs.map((l) => l.mode), ['foot']);
  assert.equal(calls.length, 0);
});

test('sem trecho a pé, o passo a passo também não o menciona', async () => {
  const o = { mode: 'bikeRental', detail: { from: { nome: 'A', coords: trip.from }, to: { nome: 'B', coords: trip.to } } };
  const r = await buildLegs(o, trip, route);
  assert.equal(r.steps.length, 1);
  assert.match(r.steps[0], /pedale/i);
});

test('carona sem caminhada até o motorista ainda diz onde e a que horas estar', async () => {
  const o = { mode: 'carpool', km: 3, detail: { geometry: line, ride: { motorista: 'Carlos', hora: '07:05' }, boardPoint: trip.from, alightPoint: trip.to, meeting: 'Terminal Urbano', drop: 'Fatec' } };
  const r = await buildLegs(o, trip, route);
  assert.equal(r.steps.length, 1);
  assert.match(r.steps[0], /Esteja em Terminal Urbano às 07:05/);
  assert.match(r.steps[0], /Carlos/);
});

test('cada trecho carrega o próprio passo, na mesma ordem dos passos', async () => {
  const o = { mode: 'bikeRental', detail: { from: { nome: 'Estação A', coords: at(0) }, to: { nome: 'Estação B', coords: at(10) } } };
  const r = await buildLegs(o, trip, route);
  assert.deepEqual(r.legs.map((l) => l.step), r.steps);
});

test('opção básica sem detail usa a própria geometria', async () => {
  const r = await buildLegs({ mode: 'foot', km: 1, minutes: 10, geometry: [trip.from, trip.to] }, trip, route);
  assert.equal(r.legs.length, 1);
  assert.equal(r.legs[0].geometry.length, 2);
});

