import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyOptions } from '../../src/features/rotas/opcoes-trajeto.js';

const at = (i, dLat = 0) => [-21.2 + dLat, -50.5 + i * 0.0045];
const line = (km = 10) => ({ km, minutes: km * 3, geometry: Array.from({ length: 11 }, (_, i) => at(i)), estimated: false });
const routes = () => ({ foot: [line()], bike: [line()], car: [line()] });
const prefs = { hasCar: false, hasBike: true, usesBus: true, walks: true, student: false, accessible: false };
const trip = { from: at(0), to: at(10), hora: '07:00', dias: [1, 2, 3, 4, 5], tripsPerDay: 2 };
const base = (extra = {}) => ({ routes: routes(), busCandidates: [line()], stops: [], rides: [], rideGeometries: {}, reports: [], prefs, cars: [], prices: null, stations: [], trip, ...extra });
const modes = (r) => r.options.map((o) => o.mode);

test('opções padrão: a pé, bicicleta, ônibus e carro de referência', () => {
  assert.deepEqual(modes(buildDailyOptions(base())), ['foot', 'bike', 'bus', 'moto', 'car']);
});

test('a pé de 10 km, 2 viagens por dia, evita 1964 g por dia', () => {
  const foot = buildDailyOptions(base()).options.find((o) => o.mode === 'foot');
  assert.equal(foot.avoided.day, 1964);
  assert.equal(foot.avoided.week, 9820);
});

test('ônibus é sempre estimado e o carro de referência não evita nada', () => {
  const r = buildDailyOptions(base());
  assert.equal(r.options.find((o) => o.mode === 'bus').estimated, true);
  assert.deepEqual(r.options.find((o) => o.mode === 'car').avoided, { day: 0, week: 0, month: 0 });
});

test('carona aparece com carona casada e some sem', () => {
  const ride = { id: 'r1', motorista: 'X', hora: '07:05', dias: [1, 2, 3], vagas_livres: 2, ride_id: 'rr', isExample: true };
  const com = buildDailyOptions(base({ rides: [ride], rideGeometries: { r1: line().geometry } }));
  const carona = com.options.find((o) => o.mode === 'carpool');
  assert.ok(carona);
  assert.equal(carona.isExample, true);
  assert.ok(carona.avoided.day > 0);
  assert.ok(!modes(buildDailyOptions(base())).includes('carpool'));
});

test('carona de outro dia da semana não casa', () => {
  const ride = { id: 'r1', motorista: 'X', hora: '07:00', dias: [0, 6], vagas_livres: 2, ride_id: 'rr' };
  assert.ok(!modes(buildDailyOptions(base({ rides: [ride], rideGeometries: { r1: line().geometry } }))).includes('carpool'));
});

test('aluguel de bicicleta só com ponto perto da origem e do destino, e sempre exemplo', () => {
  const stations = [{ id: 'a', nome: 'A', coords: at(0, 0.001), isExample: true }, { id: 'b', nome: 'B', coords: at(10, 0.001), isExample: true }];
  const r = buildDailyOptions(base({ stations }));
  assert.equal(r.options.find((o) => o.mode === 'bikeRental').isExample, true);
  assert.ok(!modes(buildDailyOptions(base({ stations: [stations[0]] }))).includes('bikeRental'));
});

test('origem igual ao destino não gera opções nem lança', () => {
  const r = buildDailyOptions(base({ trip: { ...trip, to: trip.from } }));
  assert.deepEqual(r.options, []);
  assert.equal(r.best, null);
});

test('best aponta menor CO2 e mais rápida entre as opções reais', () => {
  const r = buildDailyOptions(base());
  assert.ok(r.options.filter((o) => o.mode !== 'car').every((o) => r.best.lowestCo2.co2 <= o.co2));
  assert.ok(r.options.filter((o) => o.mode !== 'car').every((o) => r.best.fastest.minutes <= o.minutes));
});

test('cada opção traz horário de saída e de chegada', () => {
  const foot = buildDailyOptions(base()).options.find((o) => o.mode === 'foot');
  assert.equal(foot.leaveAt, '07:00');
  assert.equal(foot.arriveAt, '07:30');
});

test('carona: saída antecipada pela caminhada até o ponto e ponto de encontro nomeado', () => {
  const ride = { id: 'r1', motorista: 'X', hora: '07:05', dias: [1, 2, 3], vagas_livres: 2, ride_id: 'rr' };
  const landmarks = [{ nome: 'Praça A', coords: at(0) }];
  const c = buildDailyOptions(base({ rides: [ride], rideGeometries: { r1: line().geometry }, landmarks })).options.find((o) => o.mode === 'carpool');
  assert.equal(c.detail.meeting, 'Praça A');
  assert.equal(c.arriveAt > c.leaveAt, true);
});

test('um cartão de carona por motorista compatível', () => {
  const mk = (id) => ({ id, motorista: id, hora: '07:00', dias: [1], vagas_livres: 1, ride_id: id });
  const rides = [mk('a'), mk('b'), mk('c')];
  const geoms = { a: line().geometry, b: line().geometry, c: line().geometry };
  const r = buildDailyOptions(base({ rides, rideGeometries: geoms }));
  assert.equal(r.options.filter((o) => o.mode === 'carpool').length, 3);
});

test('mais de um caminho de ônibus com pontos vira mais de uma opção', () => {
  const alt = { ...line(), geometry: Array.from({ length: 11 }, (_, i) => at(i, 0.004)) };
  const stops = [{ id: 1, coords: at(0.5), nome: 'A' }, { id: 2, coords: at(9.5), nome: 'B' }, { id: 3, coords: at(0.5, 0.004), nome: 'C' }, { id: 4, coords: at(9.5, 0.004), nome: 'D' }];
  const r = buildDailyOptions(base({ busCandidates: [line(), alt], stops }));
  assert.equal(r.options.filter((o) => o.mode === 'bus').length, 2);
});

test('até 3 pares de estações de aluguel', () => {
  const st = (id, i, d) => ({ id, nome: id, coords: at(i, d), isExample: true });
  const stations = [st('a1', 0, 0.001), st('a2', 0, 0.003), st('b1', 10, 0.001), st('b2', 10, 0.003)];
  const n = buildDailyOptions(base({ stations })).options.filter((o) => o.mode === 'bikeRental').length;
  assert.ok(n >= 2 && n <= 3);
});
