
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const FILES = walk('src').filter((f) => f.endsWith('.js'));
const read = (f) => readFileSync(f, 'utf8');

const importsOf = (file) => [...read(file).matchAll(/(?:from\s+|import\s*\(\s*|^import\s+)'(\.[^']+)'/gm)]
  .map((m) => normalize(join(dirname(file), m[1])));

function layerOf(path) {
  const [, first, second] = path.split(sep);
  return first === 'features' ? `features/${second}` : first;
}

const EDGES = FILES.flatMap((file) => importsOf(file).map((target) => ({ file, target, from: layerOf(file), to: layerOf(target) })));
const crossing = (from) => EDGES.filter((e) => from(e.from) && e.from !== e.to);
const show = (list) => list.map((e) => `${e.file} -> ${e.target}`).join('\n');

const FEATURES = {
  carros: [],
  conta: ['carros'],
  onibus: ['conta'],
  perfil: ['carros', 'conta'],
  caronas: ['carros', 'conta', 'rotas'],
  rotas: ['carros', 'conta'],
};

test('todas as funções estão no mapa de dependências', () => {
  const found = new Set(FILES.filter((f) => f.startsWith(`src${sep}features`)).map((f) => f.split(sep)[2]));
  assert.deepEqual([...found].sort(), Object.keys(FEATURES).sort());
});

test('uma função só usa outra se isso estiver previsto', () => {
  const bad = EDGES.filter((e) => e.from.startsWith('features/') && e.to.startsWith('features/') && e.from !== e.to
    && !FEATURES[e.from.split('/')[1]].includes(e.to.split('/')[1]));
  assert.equal(bad.length, 0, show(bad));
});

test('as dependências entre funções não formam ciclo', () => {
  const visit = (name, path) => {
    assert.ok(!path.includes(name), `ciclo: ${[...path, name].join(' -> ')}`);
    FEATURES[name].forEach((next) => visit(next, [...path, name]));
  };
  Object.keys(FEATURES).forEach((name) => visit(name, []));
});

const ALLOWED = {
  config: [],
  shared: ['config'],
  servicos: ['config', 'shared'],
  dados: ['config'],
};

for (const [layer, allowed] of Object.entries(ALLOWED)) {
  test(`${layer} só depende de ${allowed.join(' e ') || 'si mesmo'}`, () => {
    const bad = crossing((from) => from === layer).filter((e) => !allowed.includes(e.to));
    assert.equal(bad.length, 0, show(bad));
  });
}

test('só app junta as telas', () => {
  const bad = EDGES.filter((e) => e.target.endsWith('.view.js') && e.from !== 'app');
  assert.equal(bad.length, 0, show(bad));
});

test('app não contém regra: só liga telas, dados e moldura', () => {
  const bad = EDGES.filter((e) => e.from === 'app' && e.to.startsWith('features/') && !e.target.endsWith('.view.js'));
  assert.equal(bad.length, 0, show(bad));
});

test('funções acessam dados só por dados/index.js', () => {
  const bad = EDGES.filter((e) => e.from !== 'dados' && e.to === 'dados' && e.target !== join('src', 'dados', 'index.js'));
  assert.equal(bad.length, 0, show(bad));
});

test('chamada de rede fica em servicos ou dados', () => {
  const bad = FILES.filter((f) => !['servicos', 'dados'].includes(layerOf(f)) && /\bfetch\(/.test(read(f)));
  assert.deepEqual(bad, []);
});

test('regra de negócio não mexe na tela', () => {
  const RULES = ['rotas/recomendacao.js', 'rotas/opcoes.js', 'rotas/lugares.js', 'onibus/horarios.js', 'onibus/previsao.js', 'carros/economia.js', 'caronas/regras.js', 'rotas/carbono.js', 'rotas/casar-carona.js', 'rotas/onibus-estimado.js', 'rotas/opcoes-trajeto.js', 'rotas/pernas.js', 'rotas/guia.js', 'rotas/horario.js', 'onibus/estimativa.js', 'rotas/desvio.js'];
  const bad = RULES.filter((r) => /\b(document|window|innerHTML)\b/.test(read(join('src', 'features', r))));
  assert.deepEqual(bad, []);
});

test('nenhum arquivo de código passa de 220 linhas', () => {
  const big = FILES.filter((f) => layerOf(f) !== 'config' && read(f).split('\n').length > 220);
  assert.deepEqual(big, []);
});
