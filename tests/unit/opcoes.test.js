import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOptions } from '../../src/features/rotas/opcoes.js';

const line = [[-21.2, -50.44], [-21.2, -50.43]];
const other = [[-21.21, -50.44], [-21.21, -50.43]];
const routes = {
  foot: [{ km: 1, minutes: 12, geometry: line }, { km: 1.2, minutes: 15, geometry: other }],
  bike: [{ km: 1, minutes: 4, geometry: line }],
  car: [{ km: 1.2, minutes: 3, geometry: line }],
};

test('monta as quatro opções com ônibus sobre o caminho de carro', () => {
  const options = buildOptions(routes, {});
  assert.deepEqual(options.map((o) => o.mode), ['foot', 'bike', 'bus', 'car']);
  const bus = options.find((o) => o.mode === 'bus');
  assert.equal(bus.km, 1.2);
  assert.ok(Math.abs(bus.minutes - 23.6) < 1e-9);
  assert.equal(bus.money, 5.3);
});

test('passe escolar muda só o ônibus', () => {
  const options = buildOptions(routes, { student: true });
  assert.equal(options.find((o) => o.mode === 'bus').money, 2.65);
  assert.equal(options.find((o) => o.mode === 'foot').money, 0);
});

test('a pé fica com a alternativa mais rápida', () => {
  const foot = buildOptions(routes, {}).find((o) => o.mode === 'foot');
  assert.equal(foot.minutes, 12);
});
