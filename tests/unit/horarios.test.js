import test from 'node:test';
import assert from 'node:assert/strict';
import { dayType, formatWait, localParts, nextDepartures } from '../../src/features/onibus/horarios.js';
import { LINES, lineByCode } from '../../src/config/linhas-onibus.js';

test('horário local usa o fuso de Araçatuba', () => {
  const p = localParts(new Date('2026-11-03T15:30:00Z'));
  assert.equal(p.weekday, 'Tue');
  assert.equal(p.minutes, 12 * 60 + 30);
});

test('tipo de dia', () => {
  assert.equal(dayType('Mon'), 'util');
  assert.equal(dayType('Sat'), 'sabado');
  assert.equal(dayType('Sun'), 'domingo');
});

test('próxima saída no mesmo dia', () => {
  const dir = lineByCode('104').directions[0];
  const next = nextDepartures(dir, new Date('2026-11-03T15:30:00Z'));
  assert.equal(next[0].time, '13:20');
  assert.equal(next[0].inMinutes, 50);
  assert.equal(next[0].today, true);
});

test('depois da última saída vai para o dia seguinte', () => {
  const dir = lineByCode('104').directions[0];
  const next = nextDepartures(dir, new Date('2026-11-04T02:50:00Z'), 1);                  
  assert.equal(next[0].time, '06:20');
  assert.equal(next[0].today, false);
  assert.equal(next[0].inMinutes, 390);
});

test('linha sem domingo pula para segunda', () => {
  const dir = lineByCode('103').directions[0];
  const next = nextDepartures(dir, new Date('2026-11-08T15:00:00Z'), 1);                    
  assert.equal(next[0].time, '06:20');
  assert.equal(next[0].day, 'util');
});

test('quadro das 14 linhas está coerente', () => {
  assert.equal(LINES.length, 14);
  for (const l of LINES) {
    for (const d of l.directions) {
      for (const k of ['util', 'sabado', 'domingo']) {
        assert.deepEqual([...d[k]], [...d[k]].sort(), `${l.code} ${d.from} ${k} fora de ordem`);
        for (const t of d[k]) assert.match(t, /^\d\d:\d\d$/);
      }
    }
  }
  assert.equal(lineByCode('118').directions.length, 0);
  assert.equal(lineByCode('126').directions[0].util.includes('07:50'), true);
  assert.equal(lineByCode('112').directions[0].sabado.includes('15:20'), false);
  assert.equal(lineByCode('103').directions[0].util.at(-1), '18:20');
  assert.equal(lineByCode('115').directions[1].util.at(-1), '17:50');
});

test('texto da espera', () => {
  assert.equal(formatWait(0), 'agora');
  assert.equal(formatWait(12), 'em 12 min');
  assert.equal(formatWait(60), 'em 1 h');
  assert.equal(formatWait(75), 'em 1 h 15 min');
});
