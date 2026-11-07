import { BUS_ESTIMATE } from '../../config/trajeto.js';
import { CO2_G_PER_PKM } from '../../config/transporte.js';
import { distanceToPolyline, haversine } from '../../shared/mapa/geometria.js';
import { busMinutes } from './recomendacao.js';

function nearestIndex(point, line) {
  let best = 0;
  line.forEach((v, i) => { if (haversine(point, v) < haversine(point, line[best])) best = i; });
  return best;
}

const stopsNear = (geometry, stops) => stops.filter((s) => distanceToPolyline(s.coords, geometry) <= BUS_ESTIMATE.stopBufferM);
const alongOrder = (geometry, stops) => [...stops].sort((a, b) => nearestIndex(a.coords, geometry) - nearestIndex(b.coords, geometry));

   
                                                                                                                       
                                                                                                                
                                                                                       
   
export function planBus(from, to, stops, candidates) {
  const scored = candidates.map((c) => ({ c, passed: stopsNear(c.geometry, stops) }));
  const best = scored.reduce((a, b) => (b.passed.length > a.passed.length || (b.passed.length === a.passed.length && b.c.km < a.c.km) ? b : a));
  const { c: route } = best;
                                                                                                                   
  const closest = (point) => stops.reduce((a, s) => (!a || haversine(point, s.coords) < haversine(point, a.coords) ? s : a), null);
  let board = closest(from);
  let alight = closest(to);
  if (board && haversine(from, board.coords) > BUS_ESTIMATE.maxWalkM) board = null;
  if (alight && haversine(to, alight.coords) > BUS_ESTIMATE.maxWalkM) alight = null;
  const usable = board && alight && board.id !== alight.id;
  const between = usable ? alongOrder(route.geometry, best.passed.filter((s) => s.id !== board.id && s.id !== alight.id)) : [];
  return {
    geometry: route.geometry,
    km: route.km,
    minutes: busMinutes(route.km),
    co2: CO2_G_PER_PKM.bus * route.km,
    board: usable ? board : null,
    alight: usable ? alight : null,
    stopsPassed: usable ? [board, ...between, alight] : [],
    estimated: true,
  };
}
