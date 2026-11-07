import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY } from '../../src/config/cidade.js';
import { distanceToPolyline, haversine, inBounds, pointAlong, polylineLength } from '../../src/shared/mapa/geometria.js';

test('haversine bate com a ordem de grandeza conhecida', () => {
  const d = haversine([-21.2, -50.44], [-21.2, -50.43]);
  assert.ok(d > 1000 && d < 1060, String(d));
});

test('distância até a linha cai perto de zero em cima dela', () => {
  const line = [[-21.2, -50.44], [-21.2, -50.43]];
  assert.ok(distanceToPolyline([-21.2, -50.435], line) < 1);
  const off = distanceToPolyline([-21.2009, -50.435], line);
  assert.ok(off > 90 && off < 110, String(off));
});

test('pointAlong anda pela linha', () => {
  const line = [[0, 0], [0, 1], [0, 2]];
  assert.deepEqual(pointAlong(line, 0), [0, 0]);
  assert.deepEqual(pointAlong(line, 1), [0, 2]);
  assert.ok(Math.abs(pointAlong(line, 0.5)[1] - 1) < 1e-6);
});

test('limites da cidade', () => {
  assert.ok(inBounds(CITY.center, CITY.bounds));
  assert.ok(!inBounds([-23.55, -46.63], CITY.bounds));
});


import { projectOnPolyline } from '../../src/shared/mapa/geometria.js';

test('projectOnPolyline devolve a distância percorrida até o ponto mais próximo e o desvio', () => {
  const line = [[-21.2, -50.44], [-21.2, -50.43], [-21.2, -50.42]];                                              
  const total = polylineLength(line);
  const onTheMiddle = projectOnPolyline([-21.2, -50.43], line);
  assert.ok(Math.abs(onTheMiddle.along - total / 2) < 5);
  assert.ok(onTheMiddle.offset < 1);
  const beside = projectOnPolyline([-21.2 + 200 / 111320, -50.425], line);                                        
  assert.ok(Math.abs(beside.offset - 200) < 5);
  assert.ok(beside.along > total / 2 && beside.along < total);
});

test('projectOnPolyline antes do começo e depois do fim fica nas pontas', () => {
  const line = [[-21.2, -50.44], [-21.2, -50.43]];
  assert.equal(Math.round(projectOnPolyline([-21.2, -50.45], line).along), 0);
  assert.equal(Math.round(projectOnPolyline([-21.2, -50.42], line).along), Math.round(polylineLength(line)));
});

test('projectOnPolyline de linha vazia ou de um ponto não quebra', () => {
  assert.equal(projectOnPolyline([-21.2, -50.43], []).offset, Infinity);
  assert.equal(projectOnPolyline([-21.2, -50.43], [[-21.2, -50.44]]).along, 0);
});
