import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRide, toMinutes } from '../../src/features/rotas/casar-carona.js';

const line = Array.from({ length: 11 }, (_, i) => [-21.2, -50.5 + i * 0.0045]);
const north300 = 300 / 111320;
const at = (i, dLat = 0) => [-21.2 + dLat, -50.5 + i * 0.0045];
const ride = { geometry: line, hora: '07:00' };

test('toMinutes converte HH:MM', () => assert.equal(toMinutes('07:30'), 450));
test('origem e destino perto, na ordem certa, casam', () => {
  const m = matchRide({ from: at(1, north300), to: at(8, north300), hora: '07:05' }, ride);
  assert.ok(m);
  assert.ok(Math.abs(m.walkToBoardM - 300) < 30);
  assert.ok(m.sharedKm > 2);
});
test('origem a 600 m não casa', () => assert.equal(matchRide({ from: at(1, 600 / 111320), to: at(8), hora: '07:00' }, ride), null));
test('ordem invertida não casa', () => assert.equal(matchRide({ from: at(8), to: at(1), hora: '07:00' }, ride), null));
test('folga de horário: 14 min casa, 16 min não', () => {
  assert.ok(matchRide({ from: at(1), to: at(8), hora: '07:14' }, ride));
  assert.equal(matchRide({ from: at(1), to: at(8), hora: '07:16' }, ride), null);
});
test('caminho vazio ou de um ponto devolve null', () => {
  assert.equal(matchRide({ from: at(1), to: at(8), hora: '07:00' }, { geometry: [], hora: '07:00' }), null);
  assert.equal(matchRide({ from: at(1), to: at(8), hora: '07:00' }, { geometry: [at(1)], hora: '07:00' }), null);
});

test('devolve o ponto de embarque e de desembarque no caminho do motorista', () => {
  const m = matchRide({ from: at(1, north300), to: at(8, north300), hora: '07:00' }, ride);
  assert.deepEqual(m.boardPoint, line[1]);
  assert.deepEqual(m.alightPoint, line[8]);
});

test('a janela de horário pode ser ampliada para a busca de rotas', () => {
  assert.equal(matchRide({ from: at(1), to: at(8), hora: '08:00' }, ride), null);
  assert.ok(matchRide({ from: at(1), to: at(8), hora: '08:00' }, ride, { maxMinutes: 120 }));
});
