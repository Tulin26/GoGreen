import test from 'node:test';
import assert from 'node:assert/strict';
import { expandRuas, parseCnefe, searchLocal } from '../../src/servicos/enderecos-locais.js';

const HEADER = 'COD_UNICO_ENDERECO;COD_UF;COD_MUNICIPIO;COD_DISTRITO;COD_SUBDISTRITO;COD_SETOR;NUM_QUADRA;NUM_FACE;CEP;DSC_LOCALIDADE;NOM_TIPO_SEGLOGR;NOM_TITULO_SEGLOGR;NOM_SEGLOGR;NUM_ENDERECO;DSC_MODIFICADOR;NOM_COMP_ELEM1;VAL_COMP_ELEM1;NOM_COMP_ELEM2;VAL_COMP_ELEM2;NOM_COMP_ELEM3;VAL_COMP_ELEM3;NOM_COMP_ELEM4;VAL_COMP_ELEM4;NOM_COMP_ELEM5;VAL_COMP_ELEM5;LATITUDE;LONGITUDE;NV_GEO_COORD';
const row = (tipo, titulo, nome, num, bairro, lat, lng) => `1;35;3502804;1;1;1;1;1;16013130;${bairro};${tipo};${titulo};${nome};${num};;;;;;;;;;;;${lat};${lng};1`;
const CSV = [
  HEADER,
  row('RUA', '', 'FLORIANO PEIXOTO', 100, 'VILA MENDONCA', '-21.2000', '-50.4300'),
  row('RUA', '', 'FLORIANO PEIXOTO', 200, 'VILA MENDONCA', '-21.2010', '-50.4300'),
  row('RUA', '', 'FLORIANO PEIXOTO', 200, 'VILA MENDONCA', '-21.2999', '-50.4999'),                                 
  row('RUA', '', 'FLORIANO PEIXOTO', 0, 'VILA MENDONCA', '-21.2500', '-50.4300'),                          
  row('AVENIDA', 'DOUTOR', 'ANTONIO GOMES', 50, 'SAUDADE', '-21.2100', '-50.4400'),
  row('RUA', '', 'FLORIANO PEIXOTO', 300, 'VILA MENDONCA', '-21.2020', '-50.4300'),
].join('\n');

const ruas = expandRuas(parseCnefe(CSV));

test('parseCnefe agrupa por rua, com bairro, sem número zero e sem número repetido', () => {
  const p = parseCnefe(CSV);
  assert.equal(p.length, 2);
  const f = p.find((r) => r.n === 'Rua Floriano Peixoto');
  assert.equal(f.b, 'Vila Mendonca');
  assert.equal(expandRuas([f])[0].addr.length, 3);
  assert.equal(p.find((r) => r.n === 'Avenida Doutor Antonio Gomes').b, 'Saudade');
});

test('expandRuas devolve números em ordem com coordenadas de volta', () => {
  const f = ruas.find((r) => r.n === 'Rua Floriano Peixoto');
  assert.deepEqual(f.addr.map((a) => a.num), [100, 200, 300]);
  assert.ok(Math.abs(f.addr[1].lat - -21.201) < 0.00001 && Math.abs(f.addr[1].lng - -50.43) < 0.00001);
});

test('busca rua com número exato', () => {
  const [r] = searchLocal('rua floriano peixoto 200', ruas);
  assert.equal(r.title, 'Rua Floriano Peixoto, 200');
  assert.equal(r.exact, true);
  assert.deepEqual(r.point.map((x) => Math.round(x * 10000)), [-212010, -504300]);
});

test('abreviações e acentos: "r. floriano, 200" acha a mesma rua', () => {
  assert.equal(searchLocal('r. floriano, 200', ruas)[0].title, 'Rua Floriano Peixoto, 200');
});

test('número que não existe é interpolado entre vizinhos e marcado como aproximado', () => {
  const [r] = searchLocal('floriano peixoto 250', ruas);
  assert.equal(r.exact, false);
  assert.match(r.subtitle, /aproximado/);
  assert.ok(r.point[0] < -21.2010 && r.point[0] > -21.2020);
});

test('número fora da faixa usa o mais próximo, também aproximado', () => {
  const [r] = searchLocal('floriano peixoto 999', ruas);
  assert.equal(r.exact, false);
  assert.ok(Math.abs(r.point[0] - -21.202) < 0.0001);
});

test('sem número, devolve a rua pelo ponto do meio', () => {
  const [r] = searchLocal('doutor antonio gomes', ruas);
  assert.equal(r.title, 'Avenida Doutor Antonio Gomes');
  assert.match(r.subtitle, /Saudade/);
});

test('consulta curta ou sem rua devolve vazio', () => {
  assert.deepEqual(searchLocal('ab', ruas), []);
  assert.deepEqual(searchLocal('xyz inexistente 12', ruas), []);
  assert.deepEqual(searchLocal('123', ruas), []);
});
