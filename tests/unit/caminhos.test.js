import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY } from '../../src/config/cidade.js';
import { getRoutes, parseRoutes, straightLine } from '../../src/servicos/caminhos.js';
import { fakeMaps, rotasForaDoAr } from './_google.js';
import { PLACES } from '../../src/config/lugares.js';
import { findLocalPlaces } from '../../src/features/rotas/lugares.js';
import { normalize } from '../../src/shared/texto.js';
import { haversine, inBounds } from '../../src/shared/mapa/geometria.js';

test('lugares locais acham nomes populares e ficam na cidade', () => {
  assert.equal(findLocalPlaces('Fatec Araçatuba')[0].title, 'Fatec Araçatuba');
  assert.equal(findLocalPlaces('fatec')[0].title, 'Fatec Araçatuba');
  assert.equal(findLocalPlaces('Praça Rui Barbosa')[0].title, 'Praça Rui Barbosa');
  assert.equal(findLocalPlaces('Rua Silva Jardim').length, 0);
  assert.equal(normalize('Ônibus Açaí'), 'onibus acai');
  for (const p of PLACES) assert.ok(inBounds(p.point, CITY.bounds), p.title);
});

const ROUTE = { distanceMeters: 2000, durationMillis: 600000, path: [{ lat: -21.2, lng: -50.4 }, { lat: -21.21, lng: -50.41 }] };
const OSRM = { code: 'Ok', routes: [{ distance: 2000, duration: 600, geometry: { coordinates: [[-50.4, -21.2], [-50.41, -21.21]] } }] };

test('parseRoutes converte unidades e o caminho (lng, lat) para [lat, lng]', () => {
  const [r] = parseRoutes(OSRM);
  assert.equal(r.km, 2);
  assert.equal(r.minutes, 10);
  assert.deepEqual(r.geometry, [[-21.2, -50.4], [-21.21, -50.41]]);
  assert.equal(r.estimated, false);
});

test('parseRoutes sem rotas lança', () => {
  assert.throws(() => parseRoutes({ code: 'Ok', routes: [] }), /NoRoute/);
  assert.throws(() => parseRoutes({ code: 'NoRoute', routes: OSRM.routes }), /NoRoute/);
  assert.throws(() => parseRoutes(undefined), /NoRoute/);
});

test('getRoutes pede ao servidor o modo certo, só o necessário e na ordem lat,lng', async () => {
  const { calls } = fakeMaps({ computeRoutes: async () => ({ routes: [ROUTE] }) });
  const [r] = await getRoutes('bike', [-21.2, -50.44], [-21.21, -50.43]);
  assert.equal(r.km, 2);
  const req = calls.routes[0];
  assert.equal(req.travelMode, 'BICYCLING');
  assert.deepEqual(req.origin, { lat: -21.2, lng: -50.44 });
  assert.equal(req.computeAlternativeRoutes, false);
});

test('alternativas só são pedidas para carro e só quando solicitadas', async () => {
  const { calls } = fakeMaps({ computeRoutes: async () => ({ routes: [ROUTE, ROUTE] }) });
  await getRoutes('car', [-21.2001, -50.4401], [-21.2102, -50.4302]);
  await getRoutes('car', [-21.2003, -50.4403], [-21.2104, -50.4304], { alternatives: true });
  await getRoutes('foot', [-21.2005, -50.4405], [-21.2106, -50.4306], { alternatives: true });
  assert.deepEqual(calls.routes.map((c) => c.computeAlternativeRoutes), [false, true, false]);
  assert.deepEqual(calls.routes.map((c) => c.travelMode), ['DRIVING', 'DRIVING', 'WALKING']);
});

test('a mesma consulta usa o cache e não repete o pedido', async () => {
  const { calls } = fakeMaps({ computeRoutes: async () => ({ routes: [ROUTE] }) });
  await getRoutes('foot', [-21.3, -50.5], [-21.31, -50.51]);
  await getRoutes('foot', [-21.3, -50.5], [-21.31, -50.51]);
  assert.equal(calls.routes.length, 1);
});

test('sem o servidor de rotas (fora do ar ou sem rota) cai para a estimativa marcada', async () => {
  rotasForaDoAr();
  const [r] = await getRoutes('car', [-21.1, -50.4], [-21.15, -50.45]);
  assert.equal(r.estimated, true);
  assert.ok(r.km > 0);
  fakeMaps({ computeRoutes: async () => ({ routes: [] }) });
  const [sem] = await getRoutes('car', [-21.11, -50.41], [-21.16, -50.46]);
  assert.equal(sem.estimated, true);
});

test('estimativa aplica o fator de desvio', () => {
  const from = [-21.2, -50.44];
  const to = [-21.2, -50.43];
  const [r] = straightLine('foot', from, to);
  assert.ok(Math.abs(r.km - (haversine(from, to) / 1000) * 1.3) < 1e-9);
});

