import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, suggestPlaces } from '../../src/servicos/enderecos.js';
import { setGoogleForTests } from '../../src/shared/mapa/google.js';
import { fakeMaps } from './_google.js';

const prediction = (main, secondary, lat, lng) => ({
  placePrediction: {
    mainText: { text: main }, secondaryText: { text: secondary }, text: { text: `${main}, ${secondary}` },
    toPlace: () => ({ fetchFields: async () => {}, location: { lat: () => lat, lng: () => lng } }),
  },
});

test('suggestPlaces restringe à área de Araçatuba, ao Brasil e ao português', async () => {
  const { maps, calls } = fakeMaps({ suggestions: [prediction('Santa Casa', 'Rua Floriano Peixoto', -21.206, -50.429)] });
  setGoogleForTests(maps);
  await suggestPlaces('santa casa');
  const req = calls.autocomplete[0];
  assert.equal(req.input, 'santa casa');
  assert.deepEqual(req.includedRegionCodes, ['br']);
  assert.equal(req.language, 'pt-BR');
  assert.ok(req.locationRestriction.west < -50.4 && req.locationRestriction.east > -50.4);

  assert.ok(req.locationRestriction.north - req.locationRestriction.south < 0.3);
  assert.ok(req.sessionToken);
});

test('suggestPlaces devolve título, subtítulo e resolve() com as coordenadas só do escolhido', async () => {
  const { maps } = fakeMaps({ suggestions: [prediction('Santa Casa', 'Rua Floriano Peixoto', -21.206, -50.429)] });
  setGoogleForTests(maps);
  const [item] = await suggestPlaces('santa casa');
  assert.equal(item.title, 'Santa Casa');
  assert.equal(item.subtitle, 'Rua Floriano Peixoto');
  assert.deepEqual(await item.resolve(), [-21.206, -50.429]);
});

test('sugestões sem previsão de lugar (por exemplo, de consulta) são ignoradas', async () => {
  const { maps } = fakeMaps({ suggestions: [{ queryPrediction: {} }, prediction('Fatec', 'Av. Prestes Maia', -21.18, -50.45)] });
  setGoogleForTests(maps);
  assert.equal((await suggestPlaces('fa')).length, 1);
});

test('suggestPlaces falha em silêncio: sem o Google devolve lista vazia', async () => {
  setGoogleForTests({ importLibrary: async () => { throw new Error('sem-chave-google'); } });
  assert.deepEqual(await suggestPlaces('qualquer'), []);
});

test('searchPlaces devolve os lugares com ponto [lat, lng] já pronto', async () => {
  const { maps, calls } = fakeMaps({ places: [{ displayName: 'Farmácia Princesa', formattedAddress: 'Rua Tupinambás, Araçatuba', location: { lat: () => -21.2, lng: () => -50.43 } }] });
  setGoogleForTests(maps);
  const [p] = await searchPlaces('farmácia princesa');
  assert.deepEqual(p, { title: 'Farmácia Princesa', subtitle: 'Rua Tupinambás, Araçatuba', point: [-21.2, -50.43] });
  assert.equal(calls.search[0].textQuery, 'farmácia princesa');
  assert.ok(calls.search[0].fields.includes('location'));
});

const OSM = [{ name: 'Etec Dr. Adail Nunes da Silva', display_name: 'Etec Dr. Adail Nunes da Silva, Rua Teste, Vila Nova, Araçatuba, São Paulo', lat: '-21.21', lon: '-50.44' }];
const fetchOsm = (corpo, ok = true) => { const chamadas = []; globalThis.fetch = async (url) => { chamadas.push(String(url)); return { ok, status: ok ? 200 : 503, json: async () => corpo }; }; return chamadas; };

test('searchPlaces: quando o Google falha, a busca continua pelo OpenStreetMap', async () => {
  setGoogleForTests({ importLibrary: async () => { throw new Error('google-nao-carregou'); } });
  const chamadas = fetchOsm(OSM);
  const [p] = await searchPlaces('etec');
  assert.deepEqual(p, { title: 'Etec Dr. Adail Nunes da Silva', subtitle: 'Rua Teste, Vila Nova, Araçatuba', point: [-21.21, -50.44] });
  assert.match(chamadas[0], /nominatim\.openstreetmap\.org\/search\?/);
  assert.match(chamadas[0], /bounded=1/);
  assert.match(chamadas[0], /countrycodes=br/);
});

test('searchPlaces: o Google achou, o OpenStreetMap nem é chamado; o Google não achou nada, é chamado', async () => {
  const achou = fakeMaps({ places: [{ displayName: 'Fatec', formattedAddress: 'Av. Prestes Maia', location: { lat: () => -21.18, lng: () => -50.45 } }] });
  setGoogleForTests(achou.maps);
  const chamadas = fetchOsm(OSM);
  assert.equal((await searchPlaces('fatec'))[0].title, 'Fatec');
  assert.equal(chamadas.length, 0);
  setGoogleForTests(fakeMaps({ places: [] }).maps);
  const depois = fetchOsm(OSM); // fakeMaps troca o fetch; rearma o do OpenStreetMap
  assert.equal((await searchPlaces('etec'))[0].title, 'Etec Dr. Adail Nunes da Silva');
  assert.equal(depois.length, 1);
});

test('searchPlaces: sem Google e com o OpenStreetMap fora do ar, devolve lista vazia em vez de quebrar a busca', async () => {
  setGoogleForTests({ importLibrary: async () => { throw new Error('google-nao-carregou'); } });
  fetchOsm({}, false);
  assert.deepEqual(await searchPlaces('qualquer'), []);
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  assert.deepEqual(await searchPlaces('qualquer'), []);
});

test('searchPlaces: o cancelamento da busca continua sendo erro, para a tela ignorar', async () => {
  setGoogleForTests({ importLibrary: async () => { throw new Error('google-nao-carregou'); } });
  globalThis.fetch = async () => { throw new DOMException('aborted', 'AbortError'); };
  await assert.rejects(searchPlaces('x'), (e) => e.name === 'AbortError');
});
