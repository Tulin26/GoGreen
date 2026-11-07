import test from 'node:test';
import assert from 'node:assert/strict';
import { addMinutes } from '../../src/features/rotas/horario.js';
import { meetingPoint } from '../../src/shared/mapa/referencia.js';

test('addMinutes soma e dá a volta na meia-noite', () => {
  assert.equal(addMinutes('07:00', 25), '07:25');
  assert.equal(addMinutes('23:50', 20), '00:10');
  assert.equal(addMinutes('00:05', -10), '23:55');
  assert.equal(addMinutes('07:00', 20.4), '07:20');
});

const marks = [{ nome: 'Praça A', coords: [-21.2, -50.43] }, { nome: 'Ponto B', coords: [-21.2, -50.44] }];
test('meetingPoint usa o lugar conhecido mais perto, até 300 m', () => {
  assert.equal(meetingPoint([-21.2002, -50.43], marks), 'Praça A');
});
test('meetingPoint longe de tudo diz a distância ao mais perto', () => {
  assert.match(meetingPoint([-21.2, -50.435], marks), /^a \d+ m de (Praça A|Ponto B)$/);
});
test('meetingPoint sem referências devolve null', () => assert.equal(meetingPoint([-21.2, -50.43], []), null));

import { stopLabel } from '../../src/shared/mapa/referencia.js';
test('stopLabel usa o nome do ponto, ou o lugar mais perto', () => {
  assert.equal(stopLabel({ nome: 'Central', coords: [-21.2, -50.43] }, marks), 'ponto Central');
  assert.equal(stopLabel({ nome: null, coords: [-21.2002, -50.43] }, marks), 'ponto de ônibus perto de Praça A');
  assert.match(stopLabel({ nome: null, coords: [-21.2, -50.435] }, marks), /^ponto de ônibus a \d+ m de /);
  assert.equal(stopLabel({ nome: null, coords: [-21.2, -50.43] }, []), 'ponto de ônibus');
});
