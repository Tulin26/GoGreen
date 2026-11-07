import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuide } from '../../src/features/rotas/guia.js';

const at = (i, dLat = 0) => [-21.2 + dLat, -50.5 + i * 0.0045];                         
const legs = [
  { mode: 'foot', geometry: [at(0), at(1)], step: 'Caminhe até a estação' },
  { mode: 'bike', geometry: [at(1), at(5)], step: 'Pedale até o destino' },
];
const m = (dLat) => dLat / 111320;                                 

test('no começo, está no primeiro trecho e diz quanto falta', () => {
  const g = createGuide(legs);
  const s = g.update({ point: at(0), accuracy: 10 });
  assert.equal(s.legIndex, 0);
  assert.equal(s.step, 'Caminhe até a estação');
  assert.ok(Math.abs(s.distToLegEndM - 465) < 30);
  assert.equal(s.arrived, false);
});

test('perto do fim do trecho, passa para o próximo e nunca volta', () => {
  const g = createGuide(legs);
  assert.equal(g.update({ point: at(0.97), accuracy: 10 }).legIndex, 1);
  assert.equal(g.update({ point: at(0.5), accuracy: 10 }).legIndex, 1);
});

test('longe do traçado avisa que saiu da rota, e perto dele não', () => {
  const g = createGuide(legs);
  assert.equal(g.update({ point: at(0.5, m(200)), accuracy: 10 }).off, true);
  assert.equal(g.update({ point: at(0.5, m(20)), accuracy: 10 }).off, false);
});

test('ao chegar no fim do último trecho, termina', () => {
  const g = createGuide(legs);
  g.update({ point: at(1), accuracy: 5 });
  const s = g.update({ point: at(5), accuracy: 5 });
  assert.equal(s.arrived, true);
});

test('sinal ruim (100 m de erro) usa tolerância limitada a 50 m, não 100', () => {
  const g = createGuide(legs);
  assert.equal(g.update({ point: at(1, m(45)), accuracy: 100 }).legIndex, 1);
  const g2 = createGuide(legs);
  assert.equal(g2.update({ point: at(1, m(80)), accuracy: 100 }).legIndex, 0);
});

test('sem trechos não quebra', () => {
  assert.equal(createGuide([]).update({ point: at(0), accuracy: 5 }).arrived, true);
});
