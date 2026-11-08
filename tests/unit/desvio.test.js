import test from 'node:test';
import assert from 'node:assert/strict';
import { co2Avoided, costOf, detourSummary, estimateExtraKm, prefilter } from '../../src/features/rotas/desvio.js';
import { detourFor } from '../../src/servicos/desvio.js';
import { fakeMaps, rotasForaDoAr } from './_google.js';

const STEP = 100 / (((Math.PI / 180) * 6371000) * Math.cos((21.2 * Math.PI) / 180));
const road = Array.from({ length: 101 }, (_, i) => [-21.2, -50.5 + i * STEP]);
const at = (km, northM = 0) => [-21.2 + northM / 111320, -50.5 + (km * 10) * STEP];

test('pré-filtro: passageiro perto do caminho e na ordem certa passa', () => {
  const r = prefilter(road, { from: at(2, 500), to: at(8, 300) });
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.pickupOffsetM - 500) < 5);
  assert.ok(Math.abs(r.dropoffOffsetM - 300) < 5);
});

test('pré-filtro: longe demais (mais de 800 m do caminho) não passa', () => {
  assert.equal(prefilter(road, { from: at(2, 1000), to: at(8, 100) }).ok, false);
  assert.equal(prefilter(road, { from: at(2, 100), to: at(8, 1000) }).ok, false);
});

test('pré-filtro: sentido contrário e longe não passa', () => {
  const r = prefilter(road, { from: at(8, 100), to: at(2, 100) });
  assert.equal(r.ok, false);
  assert.equal(r.sameDirection, false);
  assert.equal(prefilter(road, { from: at(7), to: at(4) }).ok, false);
});

test('pré-filtro: sentido contrário só passa se o desvio for de até 1 km', () => {
  const perto = prefilter(road, { from: at(5.3), to: at(5) });
  assert.equal(perto.sameDirection, false);
  assert.ok(perto.extraKm > 0 && perto.extraKm <= 1);
  assert.equal(perto.ok, true);
  assert.equal(prefilter(road, { from: at(6.2), to: at(5) }).ok, false);
});

test('pré-filtro: o caminho do motorista tem de chegar perto do destino da pessoa', () => {
  const terminaAntes = road.slice(0, 61);
  assert.equal(prefilter(terminaAntes, { from: at(1), to: at(9) }).ok, false);
  assert.equal(prefilter(terminaAntes, { from: at(1), to: at(5.8) }).ok, true);
});

test('pré-filtro: motorista que só cruza a rota da pessoa não serve', () => {
  const cruzando = [at(5, -4000), at(5, 4000)];
  assert.equal(prefilter(cruzando, { from: at(2), to: at(8) }).ok, false);
});

test('pré-filtro: sem o Google, a reta entre saída e destino vale como caminho', () => {
  const reta = [at(0), at(10)];
  assert.equal(prefilter(reta, { from: at(2, 300), to: at(8, 300) }).ok, true);
  assert.equal(prefilter(reta, { from: at(2, 5000), to: at(8) }).ok, false);
});

test('desvio estimado: quase zero quando o passageiro está no caminho, grande quando não', () => {
  assert.ok(estimateExtraKm(at(0), at(10), at(2), at(8)) < 0.05);
  assert.ok(estimateExtraKm(at(0), at(10), at(8), at(2)) > 10);
});

test('desvio é a diferença entre a rota com o passageiro e a rota base, nunca negativa', () => {
  assert.deepEqual(detourSummary({ km: 10, minutes: 20 }, { km: 11.5, minutes: 26 }), { extraKm: 1.5, extraMin: 6 });
  assert.deepEqual(detourSummary({ km: 10, minutes: 20 }, { km: 9.9, minutes: 19 }), { extraKm: 0, extraMin: 0 });
});

test('custo: combustível do desvio e divisão sugerida (metade do trecho dividido mais o desvio)', () => {

  const c = costOf({ extraKm: 2, sharedKm: 10, kmPerLiter: 12, gasPrice: 6 });
  assert.equal(c.extraFuel, 1);
  assert.equal(c.suggestedShare, 3.5);
});

test('custo sem desvio: só a metade do trecho', () => {
  assert.equal(costOf({ extraKm: 0, sharedKm: 10, kmPerLiter: 12, gasPrice: 6 }).suggestedShare, 2.5);
});

test('CO2 evitado: o carro do passageiro sozinho menos o desvio do motorista, nunca negativo', () => {
  assert.equal(co2Avoided({ passengerKm: 10, extraKm: 2 }), 98.2 * 8);
  assert.equal(co2Avoided({ passengerKm: 1, extraKm: 5 }), 0);
});

const ROUTE = (km, min) => ({ distanceMeters: km * 1000, durationMillis: min * 60000, path: [{ lat: -21.2, lng: -50.5 }, { lat: -21.2, lng: -50.4 }] });

test('detourFor compara a rota base com a rota passando pelo passageiro (embarque e desembarque, nessa ordem)', async () => {
  const { calls } = fakeMaps({ computeRoutes: async (req) => ({ routes: [req.intermediates ? ROUTE(11.5, 26) : ROUTE(10, 20)] }) });
  const r = await detourFor({ from: [-21.2, -50.5], to: [-21.2, -50.4] }, { from: [-21.2005, -50.47], to: [-21.2005, -50.43] });
  assert.equal(r.extraKm, 1.5);
  assert.equal(r.extraMin, 6);
  const withPassenger = calls.routes.find((c) => c.intermediates);
  assert.deepEqual(withPassenger.intermediates, [{ location: { lat: -21.2005, lng: -50.47 } }, { location: { lat: -21.2005, lng: -50.43 } }]);
  assert.equal(withPassenger.travelMode, 'DRIVING');
  assert.ok(r.base.geometry.length >= 2 && r.withPassenger.geometry.length >= 2);
});

test('sem o servidor de rotas (ou só estimativa em linha reta) o desvio vem como null, sem inventar', async () => {
  rotasForaDoAr();
  assert.equal(await detourFor({ from: [-21.21, -50.51], to: [-21.21, -50.41] }, { from: [-21.2105, -50.48], to: [-21.2105, -50.44] }), null);
});

import { analyze } from '../../src/features/rotas/desvio.js';

test('analyze junta desvio, combustível, divisão sugerida e CO2 evitado', () => {
  const a = analyze({ detour: { extraKm: 2, extraMin: 5 }, passengerKm: 10, perKm: 0.5 });
  assert.equal(a.extraKm, 2);
  assert.equal(a.extraMin, 5);
  assert.equal(a.extraFuel, 1);
  assert.equal(a.suggestedShare, 3.5);
  assert.equal(a.co2, 98.2 * 8);
});

test('analyze sem desvio calculado marca como não calculado, mas ainda dá custo do trecho e CO2 do passageiro', () => {
  const a = analyze({ detour: null, passengerKm: 10, perKm: 0.5 });
  assert.equal(a.calculated, false);
  assert.equal(a.suggestedShare, 2.5);
  assert.equal(a.co2, 982);
});

test('costOf aceita o custo por km direto', () => {
  assert.equal(costOf({ extraKm: 2, sharedKm: 10, perKm: 0.5 }).suggestedShare, 3.5);
});
