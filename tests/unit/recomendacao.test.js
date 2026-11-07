import test from 'node:test';
import assert from 'node:assert/strict';
import { baseScore, bestMetrics, busMinutes, co2For, isCandidate, moneyFor, pickAlternative, rankOptions } from '../../src/features/rotas/recomendacao.js';

const opt = (mode, minutes, km, extra = {}) => ({ mode, minutes, km, money: moneyFor(mode, km), co2: co2For(mode, km), ...extra });

test('CO2 usa os fatores do BNDES por passageiro.km', () => {
  assert.equal(co2For('car', 10), 982);
  assert.equal(co2For('bus', 10), 195);
  assert.equal(co2For('foot', 10), 0);
});

test('custo do carro é só combustível e o ônibus usa a tarifa', () => {
  assert.ok(Math.abs(moneyFor('car', 12) - 6.30) < 1e-9);
  assert.equal(moneyFor('bus', 12), 5.3);
  assert.equal(moneyFor('bus', 12, { student: true }), 2.65);
  assert.equal(moneyFor('bike', 12), 0);
});

test('tempo de ônibus soma trecho, caminhada e espera', () => {
  assert.equal(busMinutes(5), 35);
});

test('entre alternativas do mesmo modo, fica a de menor tempo', () => {
  const alts = [{ minutes: 15, km: 1.2 }, { minutes: 12, km: 1 }, { minutes: 20, km: 2 }];
  assert.equal(pickAlternative(alts).minutes, 12);
});

test('quem pode entrar na recomendação', () => {
  assert.equal(isCandidate(opt('bike', 5, 1), {}), false);
  assert.equal(isCandidate(opt('bike', 5, 1), { hasBike: true }), true);
  assert.equal(isCandidate(opt('bike', 5, 1), { hasBike: true, accessible: true }), false);
  assert.equal(isCandidate(opt('car', 5, 1), {}), false);
  assert.equal(isCandidate(opt('foot', 46, 3.8), {}), false);
  assert.equal(isCandidate(opt('foot', 45.4, 3.6), {}), true);
  assert.equal(isCandidate(opt('bus', 30, 3), {}), true);
});

test('bike e carro só disputam se a pessoa marcou', () => {
  const options = [opt('foot', 24, 2), opt('bike', 8, 2), opt('bus', busMinutes(2), 2), opt('car', 5, 2)];
  assert.equal(rankOptions(options).best.mode, 'foot');
  assert.equal(rankOptions(options, { hasBike: true }).best.mode, 'bike');
});

test('caminhada longa sai da recomendação', () => {
  const out = rankOptions([opt('foot', 100, 8), opt('bus', busMinutes(8), 8)]);
  assert.equal(out.best.mode, 'bus');
});

test('carro não vence ônibus em trajeto médio só por ser rápido', () => {
  const car = opt('car', 12, 5);
  const bus = opt('bus', busMinutes(5), 5);
  assert.ok(baseScore(bus) < baseScore(car));
  assert.equal(rankOptions([car, bus], { hasCar: true }).best.mode, 'bus');
});

test('rótulo de melhor métrica aceita empate', () => {
  const foot = opt('foot', 12, 1);
  const bike = opt('bike', 4, 1);
  const car = opt('car', 3, 1);
  const best = bestMetrics([foot, bike, car]);
  assert.equal(best.money(foot) && best.money(bike), true);
  assert.equal(best.money(car), false);
  assert.equal(best.minutes(car), true);
  assert.equal(best.co2(foot) && best.co2(bike), true);
});

test('quem não usa ônibus ou não anda a pé não recebe essa recomendação', () => {
  const bus = { mode: 'bus', minutes: 10 };
  const foot = { mode: 'foot', minutes: 10 };
  assert.equal(isCandidate(bus, {}), true);
  assert.equal(isCandidate(foot, {}), true);
  assert.equal(isCandidate(bus, { usesBus: false }), false);
  assert.equal(isCandidate(foot, { walks: false }), false);
});

test('a ordenação devolve só a melhor e as outras, sem explicação de relatos', () => {
  const out = rankOptions([opt('foot', 12, 1), opt('bus', 23, 1)]);
  assert.deepEqual(Object.keys(out).sort(), ['best', 'others']);
});
