import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGroup } from '../../src/shared/mapa/grupo.js';

// Motor de mentira: guarda o que está desenhado agora.
function fakeEngine(nome = 'a') {
  const vivo = new Set();
  return { nome, vivo, draw(shape) { vivo.add(shape); return { remove: () => vivo.delete(shape) }; } };
}

test('desenha na hora e guarda a descrição de cada desenho', () => {
  const e = fakeEngine();
  const g = makeGroup(() => e);
  g.line([[0, 0], [1, 1]], { color: '#f00', dashed: true });
  g.pin([2, 2], { title: 'Embarque' });
  g.circle([3, 3], 50);
  g.dot([4, 4]);
  assert.deepEqual([...e.vivo].map((s) => s.type), ['line', 'pin', 'circle', 'dot']);
  assert.equal([...e.vivo][0].dashed, true);
  assert.equal([...e.vivo][1].title, 'Embarque');
});

test('clear apaga tudo e esquece', () => {
  const e = fakeEngine();
  const g = makeGroup(() => e);
  g.line([[0, 0], [1, 1]]); g.pin([2, 2]);
  g.clear();
  assert.equal(e.vivo.size, 0);
  assert.equal(g.size(), 0);
});

test('trocar o motor (Google vira OpenStreetMap) redesenha tudo no motor novo, sem repetir no antigo', () => {
  let atual = fakeEngine('google');
  const velho = atual;
  const g = makeGroup(() => atual);
  g.line([[0, 0], [1, 1]]); g.pin([2, 2]); g.dot([3, 3]);
  g.detach();
  atual = fakeEngine('leaflet');
  g.redraw();
  assert.equal(velho.vivo.size, 0);
  assert.equal(atual.vivo.size, 3);
  g.redraw();
  assert.equal(atual.vivo.size, 3);
});

test('sem motor ainda (mapa carregando), guarda os desenhos e desenha quando o motor chega', () => {
  let atual = null;
  const g = makeGroup(() => atual);
  g.line([[0, 0], [1, 1]]); g.pin([2, 2]);
  assert.equal(g.size(), 2);
  atual = fakeEngine();
  g.redraw();
  assert.equal(atual.vivo.size, 2);
});

test('remover um desenho pelo retorno tira só aquele da lista de redesenho', () => {
  const e = fakeEngine();
  const g = makeGroup(() => e);
  const a = g.pin([1, 1]);
  g.pin([2, 2]);
  a.remove();
  g.detach(); g.redraw();
  assert.equal(e.vivo.size, 1);
});
