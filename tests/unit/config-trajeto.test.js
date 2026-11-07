import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MATCH, MONTH_WEEKS, BUS_ESTIMATE, BIKE_RENTAL } from '../../src/config/trajeto.js';
import { EXAMPLE_BIKE_STATIONS, EXAMPLE_DAILY_RIDES } from '../../src/config/exemplos.js';

const inCity = ([lat, lng]) => lat < -20.9 && lat > -21.3 && lng > -50.6 && lng < -50.3;

test('parâmetros do trajeto', () => {
  assert.equal(MATCH.maxM, 500);
  assert.equal(MATCH.maxMinutes, 15);
  assert.equal(MONTH_WEEKS, 4.33);
  assert.equal(BUS_ESTIMATE.maxWalkM, 800);
  assert.equal(BIKE_RENTAL.kmh, 15);
});

test('pontos de bicicleta de aluguel são exemplos dentro da cidade', () => {
  assert.equal(EXAMPLE_BIKE_STATIONS.length, 5);
  for (const s of EXAMPLE_BIKE_STATIONS) { assert.equal(s.isExample, true); assert.ok(inCity(s.coords)); }
});

test('motoristas de exemplo do trajeto são exemplos dentro da cidade', () => {
  assert.equal(EXAMPLE_DAILY_RIDES.length, 33);
  assert.equal(new Set(EXAMPLE_DAILY_RIDES.map((r) => r.id)).size, 33);
  for (const r of EXAMPLE_DAILY_RIDES) {
    assert.equal(r.isExample, true);
    assert.ok(inCity(r.from) && inCity(r.to));
    assert.match(r.hora, /^\d\d:\d\d$/);
  }
});
