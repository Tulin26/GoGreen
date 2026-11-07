import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avoidedPerTrip, carpoolCo2, perPeriod, bestBy } from '../../src/features/rotas/carbono.js';

test('a pé evita todo o CO2 do carro sozinho', () => assert.equal(avoidedPerTrip(0, 10), 982));
test('o evitado nunca fica negativo', () => assert.equal(avoidedPerTrip(1500, 10), 0));
test('distância zero não evita nada', () => assert.equal(avoidedPerTrip(0, 0), 0));
test('carona divide o carro entre os ocupantes, mínimo 2', () => {
  assert.equal(carpoolCo2(10, 2), 491);
  assert.equal(carpoolCo2(10, 1), 491);
  assert.equal(avoidedPerTrip(carpoolCo2(10, 2), 10), 491);
});
test('semana e mês seguem dias marcados e 4,33 semanas', () => {
  assert.deepEqual(perPeriod(100, { tripsPerDay: 2, days: [1, 2, 3, 4, 5] }), { day: 200, week: 1000, month: 4330 });
});
test('sem dias marcados tudo é zero', () => {
  assert.deepEqual(perPeriod(100, { tripsPerDay: 1, days: [] }), { day: 0, week: 0, month: 0 });
});
test('bestBy acha menor CO2 e mais rápida', () => {
  const o = [{ id: 'a', co2: 0, minutes: 50 }, { id: 'b', co2: 90, minutes: 10 }];
  const r = bestBy(o);
  assert.equal(r.lowestCo2.id, 'a');
  assert.equal(r.fastest.id, 'b');
});
