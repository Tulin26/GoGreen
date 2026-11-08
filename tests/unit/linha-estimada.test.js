import test from 'node:test';
import assert from 'node:assert/strict';
import { endQuery, loadLinePath } from '../../src/servicos/linha-estimada.js';
import { setGoogleForTests } from '../../src/shared/mapa/google.js';
import { fakeMaps } from './_google.js';

const L = (code, name, back) => ({ code, name, directions: [{ from: 'Terminal' }, { from: back }] });

test('a busca do fim da linha usa o nome do sentido de volta', () => {
  assert.equal(endQuery(L('103', 'Claudionor Cinti via Cussy', 'Claudionor Cinti')), 'Claudionor Cinti, Araçatuba, SP');
  assert.equal(endQuery(L('112', 'Atlântico / Etemp', 'Etemp / Atlântico')), 'Etemp, Araçatuba, SP');
});

test('quando o sentido de volta é genérico ("Bairro"), usa o primeiro nome da linha, sem o "via"', () => {
  assert.equal(endQuery(L('121', 'Águas Claras / Rosele / Verde Parque', 'Bairro')), 'Águas Claras, Araçatuba, SP');
  assert.equal(endQuery(L('115', 'Taveira via Marcílio Dias', 'Bairro')), 'Taveira, Araçatuba, SP');
});

const ROUTE = { distanceMeters: 6000, durationMillis: 600000, path: [{ lat: -21.203, lng: -50.4385 }, { lat: -21.22, lng: -50.45 }] };
const place = { displayName: 'Jardim Teste', formattedAddress: 'Araçatuba - SP', location: { lat: () => -21.22, lng: () => -50.45 } };

test('o trajeto estimado vai do Terminal até o lugar achado, com o nome dele', async () => {
  const { maps, calls } = fakeMaps({ places: [place], computeRoutes: async () => ({ routes: [ROUTE] }) });
  setGoogleForTests(maps);
  const p = await loadLinePath(L('201', 'Teste', 'Jardim Teste'));
  assert.equal(p.endName, 'Jardim Teste');
  assert.equal(p.km, 6);
  assert.equal(p.geometry.length, 2);
  assert.equal(calls.routes[0].travelMode, 'DRIVING');
  assert.deepEqual(calls.routes[0].destination, { lat: -21.22, lng: -50.45 });
});

test('o trajeto de uma linha é calculado uma vez só na sessão', async () => {
  const { maps, calls } = fakeMaps({ places: [place], computeRoutes: async () => ({ routes: [ROUTE] }) });
  setGoogleForTests(maps);
  await loadLinePath(L('202', 'Teste', 'X'));
  await loadLinePath(L('202', 'Teste', 'X'));
  assert.equal(calls.search.length, 1);
});

test('sem lugar achado, ou sem rota de verdade do Google, não inventa trajeto', async () => {
  setGoogleForTests(fakeMaps({ places: [] }).maps);
  assert.equal(await loadLinePath(L('203', 'Teste', 'X')), null);
  const outro = { ...place, location: { lat: () => -21.27, lng: () => -50.41 } };
  setGoogleForTests(fakeMaps({ places: [outro], computeRoutes: async () => { throw new Error('off'); } }).maps);
  assert.equal(await loadLinePath(L('204', 'Teste', 'Y')), null);
});

test('sem o Google (sem chave) devolve null e tenta de novo depois', async () => {
  setGoogleForTests({ importLibrary: async () => { throw new Error('sem-chave-google'); } });
  assert.equal(await loadLinePath(L('205', 'Teste', 'Z')), null);
  const { maps, calls } = fakeMaps({ places: [place], computeRoutes: async () => ({ routes: [ROUTE] }) });
  setGoogleForTests(maps);
  assert.ok(await loadLinePath(L('205', 'Teste', 'Z')));
  assert.equal(calls.search.length, 1);
});
