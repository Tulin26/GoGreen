import test from 'node:test';
import assert from 'node:assert/strict';
import { arrivalsAt, estimatedBuses, stopsOnRoute, tripMinutes } from '../../src/features/onibus/estimativa.js';
import { haversine, polylineLength } from '../../src/shared/mapa/geometria.js';

                                                                                            
const STEP = 100 / (((Math.PI / 180) * 6371000) * Math.cos((21.2 * Math.PI) / 180));                                 
const geometry = Array.from({ length: 101 }, (_, i) => [-21.2, -50.5 + i * STEP]);
const km = polylineLength(geometry) / 1000;
const path = { geometry, km };
const line = { code: '999', directions: [
  { from: 'Terminal', util: ['07:00', '07:30', '08:00'], sabado: ['09:00'], domingo: [] },
  { from: 'Bairro', util: ['07:10'], sabado: [], domingo: [] },
] };
const TUE_0710 = new Date('2026-11-03T10:10:00Z');                             
const at = (frac) => geometry[Math.round(frac * 100)];

test('a viagem pelo traçado dura km / velocidade média do ônibus', () => {
  assert.ok(Math.abs(tripMinutes(10) - 30) < 1e-9);
  assert.ok(Math.abs(km - 10) < 0.01);
});

test('ônibus estimados: só os que saíram há menos que a duração da viagem', () => {
  const buses = estimatedBuses(line, path, TUE_0710);
  assert.equal(buses.length, 2);
  const out = buses.find((b) => b.dirIndex === 0);
  assert.equal(out.departedMin, 420);         
  assert.ok(haversine(out.point, at(1 / 3)) < 500);                                     
  const back = buses.find((b) => b.dirIndex === 1);
  assert.ok(haversine(back.point, geometry.at(-1)) < 100);                                  
});

test('o sentido de volta anda pelo traçado ao contrário', () => {
  const later = new Date('2026-11-03T10:25:00Z');                                                     
  const back = estimatedBuses(line, path, later).find((b) => b.dirIndex === 1);
  assert.ok(haversine(back.point, at(0.5)) < 600);
});

test('sem saída recente não há ônibus estimado', () => {
  assert.deepEqual(estimatedBuses(line, path, new Date('2026-11-03T15:00:00Z')), []);         
});

test('chegada a um ponto no meio do caminho soma o tempo de viagem até lá', () => {
  const r = arrivalsAt(at(0.5), line, path, TUE_0710, 3);
  assert.equal(r.offRoute, false);
  assert.deepEqual(r.arrivals.map((a) => a.clock), ['07:15', '07:25', '07:45']);
  assert.ok(Math.abs(r.arrivals[0].inMinutes - 5) < 0.2);
  assert.equal(r.arrivals[0].dirIndex, 0);
  assert.equal(r.arrivals[1].dirIndex, 1);
  assert.equal(r.arrivals[0].departedClock, '07:00');
});

test('ponto longe do trajeto não recebe previsão', () => {
  const far = [-21.2 + 2000 / 111320, -50.455];
  const r = arrivalsAt(far, line, path, TUE_0710, 3);
  assert.equal(r.offRoute, true);
  assert.ok(r.offsetM > 1500);
  assert.deepEqual(r.arrivals, []);
});

test('depois da última saída do dia, usa o primeiro horário do dia seguinte', () => {
  const night = new Date('2026-11-04T02:00:00Z');                  
  const r = arrivalsAt(at(0.5), line, path, night, 1);
  assert.equal(r.arrivals[0].clock, '07:15');
  assert.ok(r.arrivals[0].inMinutes > 8 * 60);
});

test('domingo sem saída: nenhuma chegada hoje, e o próximo horário vem da segunda', () => {
  const sun = new Date('2026-11-08T15:00:00Z');                 
  const r = arrivalsAt(at(0.5), line, path, sun, 1);
  assert.equal(r.arrivals[0].clock, '07:15');                     
});

test('pontos de ônibus no trajeto vêm em ordem e cada um com a sua próxima chegada', () => {
  const stops = [
    { id: 1, coords: at(0.8), nome: 'C' },
    { id: 2, coords: at(0.2), nome: 'A' },
    { id: 3, coords: [-21.19, -50.455], nome: 'longe' },                      
    { id: 4, coords: at(0.5), nome: 'B' },
  ];
  const r = stopsOnRoute(stops, line, path, TUE_0710);
  assert.deepEqual(r.map((s) => s.stop.nome), ['A', 'B', 'C']);
  assert.ok(r.every((s) => s.next && s.next.inMinutes >= 0));
});

