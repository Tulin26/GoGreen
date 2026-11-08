import test from 'node:test';
import assert from 'node:assert/strict';
import { describePositionError } from '../../src/shared/mapa/posicao.js';

test('mensagens distintas para cada erro de GPS', () => {
  assert.match(describePositionError({ code: 1 }), /permiss/i);
  assert.match(describePositionError({ code: 2 }), /sinal|dispon/i);
  assert.match(describePositionError({ code: 3 }), /demorou|tempo/i);
  assert.match(describePositionError(new Error('sem-gps')), /não tem GPS|não oferece/i);
});

import { watchPosition } from '../../src/shared/mapa/posicao.js';

test('watchPosition entrega posição com precisão e para quando pedido', () => {
  let handler;
  let cleared = null;
  const geolocation = {
    watchPosition: (ok, fail, opts) => { handler = { ok, fail, opts }; return 7; },
    clearWatch: (id) => { cleared = id; },
  };
  const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { geolocation }, configurable: true });
  try {
    const fixes = [];
    const errors = [];
    const stop = watchPosition((f) => fixes.push(f), (e) => errors.push(e));
    assert.equal(handler.opts.enableHighAccuracy, true);
    assert.equal(handler.opts.maximumAge, 0);
    handler.ok({ coords: { latitude: -21.2, longitude: -50.43, accuracy: 12, heading: 90 } });
    assert.deepEqual(fixes[0], { point: [-21.2, -50.43], accuracy: 12, heading: 90 });
    handler.fail({ code: 3 });
    assert.equal(errors[0].code, 3);
    stop();
    assert.equal(cleared, 7);
  } finally { if (real) Object.defineProperty(globalThis, 'navigator', real); else delete globalThis.navigator; }
});

test('watchPosition sem GPS avisa e devolve função vazia', () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
  try {
    const errors = [];
    const stop = watchPosition(() => {}, (e) => errors.push(e));
    assert.equal(errors[0].message, 'sem-gps');
    stop();
  } finally { if (real) Object.defineProperty(globalThis, 'navigator', real); else delete globalThis.navigator; }
});

import { getBestPosition } from '../../src/shared/mapa/posicao.js';

function withWatch(setup, fn) {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let cleared = 0;
  const handlers = {};
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { geolocation: { watchPosition: (ok, fail) => { handlers.ok = ok; handlers.fail = fail; setup?.(handlers); return 1; }, clearWatch: () => { cleared += 1; } } },
  });
  const done = () => { if (real) Object.defineProperty(globalThis, 'navigator', real); else delete globalThis.navigator; };
  return fn(handlers, () => cleared).finally(done);
}
const fix = (lat, acc) => ({ coords: { latitude: lat, longitude: -50.43, accuracy: acc, heading: null } });

test('getBestPosition espera uma leitura boa em vez de aceitar a primeira (aproximada)', async () => {
  await withWatch(null, async (h, cleared) => {
    const p = getBestPosition({ maxWaitMs: 5000, goodEnoughM: 60 });
    h.ok(fix(-21.5, 3000));
    h.ok(fix(-21.2, 25));
    const best = await p;
    assert.deepEqual(best.point, [-21.2, -50.43]);
    assert.equal(best.accuracy, 25);
    assert.equal(cleared(), 1);
  });
});

test('getBestPosition sem leitura boa devolve a melhor que teve ao fim do tempo', async () => {
  await withWatch(null, async (h) => {
    const p = getBestPosition({ maxWaitMs: 30, goodEnoughM: 10 });
    h.ok(fix(-21.5, 4000));
    h.ok(fix(-21.4, 900));
    assert.equal((await p).accuracy, 900);
  });
});

test('getBestPosition sem nenhuma leitura rejeita com o último erro', async () => {
  await withWatch(null, async (h) => {
    const p = getBestPosition({ maxWaitMs: 30 });
    h.fail({ code: 3 });
    await assert.rejects(p, (e) => e.code === 3);
  });
});

test('getBestPosition com permissão negada rejeita na hora', async () => {
  await withWatch(null, async (h) => {
    const p = getBestPosition({ maxWaitMs: 5000 });
    h.fail({ code: 1 });
    await assert.rejects(p, (e) => e.code === 1);
  });
});
