import { EXAMPLE_BIKE_STATIONS } from '../../config/exemplos.js';
import { BIKE_RENTAL, BUS_ESTIMATE } from '../../config/trajeto.js';
import { FALLBACK } from '../../config/transporte.js';
import { haversine } from '../../shared/mapa/geometria.js';
import { buildOptions } from './opcoes.js';
import { avoidedPerTrip, bestBy, carpoolCo2, perPeriod } from './carbono.js';
import { matchRide } from './casar-carona.js';
import { addMinutes } from './horario.js';
import { planBus } from './onibus-estimado.js';
import { meetingPoint, stopLabel } from '../../shared/mapa/referencia.js';

const MIN_TRIP_M = 100;
const MAX = { bus: 3, rental: 3, carpool: 5 };
const WALK_M_PER_MIN = (FALLBACK.kmh.foot * 1000) / 60;
const sameDay = (a, b) => a.some((d) => b.includes(d));

                                                                                                                  
function busPlans(trip, stops, candidates) {
  const seen = new Set();
  const plans = candidates.map((c) => planBus(trip.from, trip.to, stops, [c])).filter((p) => {
    if (!p.board) return false;
    const key = `${p.board.id}-${p.alight.id}-${p.stopsPassed.length}`;
    return !seen.has(key) && seen.add(key);
  });
  return plans.length ? plans.slice(0, MAX.bus) : [planBus(trip.from, trip.to, stops, candidates)];
}

                                                                                                                              
function rentalOptions(trip, stations) {
  const near = (point) => stations
    .map((s) => ({ s, d: haversine(point, s.coords) }))
    .filter((x) => x.d <= BUS_ESTIMATE.maxWalkM)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  const pairs = [];
  for (const a of near(trip.from)) {
    for (const b of near(trip.to)) {
      if (a.s.id === b.s.id) continue;
      const rideKm = (haversine(a.s.coords, b.s.coords) / 1000) * FALLBACK.detour;
      const minutes = (a.d + b.d) / WALK_M_PER_MIN + (rideKm / BIKE_RENTAL.kmh) * 60;
      pairs.push({ mode: 'bikeRental', minutes, km: rideKm + (a.d + b.d) / 1000, co2: 0, isExample: true, estimated: true, detail: { from: a.s, to: b.s, walkToM: a.d, walkFromM: b.d } });
    }
  }
  return pairs.sort((x, y) => x.minutes - y.minutes).slice(0, MAX.rental);
}

                                                                                                                    
function carpoolOptions(trip, carRoute, rides, rideGeometries, landmarks, matchMinutes) {
  return rides
    .filter((r) => rideGeometries[r.id] && sameDay(r.dias, trip.dias))
    .map((ride) => ({ ride, m: matchRide(trip, { geometry: rideGeometries[ride.id], hora: ride.hora }, { maxMinutes: matchMinutes }) }))
    .filter((x) => x.m)
    .sort((a, b) => a.m.walkToBoardM + a.m.walkFromAlightM - (b.m.walkToBoardM + b.m.walkFromAlightM))
    .slice(0, MAX.carpool)
    .map(({ ride, m }) => {
      const walkMin = (m.walkToBoardM + m.walkFromAlightM) / WALK_M_PER_MIN;
      const minutes = carRoute.minutes * (m.sharedKm / carRoute.km) + walkMin;
      const leaveAt = addMinutes(ride.hora, -Math.ceil(m.walkToBoardM / WALK_M_PER_MIN));
      return {
        mode: 'carpool', minutes, km: m.sharedKm, co2: carpoolCo2(m.sharedKm, 2), isExample: !!ride.isExample, estimated: false, leaveAt,
        detail: { ride, geometry: rideGeometries[ride.id], ...m, meeting: meetingPoint(m.boardPoint, landmarks), drop: meetingPoint(m.alightPoint, landmarks) },
      };
    });
}

   
                                                                                                                                      
                                                                                                                              
                                                                                                            
   
export function buildDailyOptions({ routes, busCandidates, stops, rides, rideGeometries, prefs, cars, prices, stations = EXAMPLE_BIKE_STATIONS, landmarks = [], trip, matchMinutes }) {
  if (haversine(trip.from, trip.to) < MIN_TRIP_M) return { options: [], best: null };
  const base = buildOptions(routes, prefs, { cars, prices });
  const carRoute = routes.car[0];
  const plans = busPlans(trip, stops, busCandidates).map((p) => ({ ...p, boardLabel: p.board && stopLabel(p.board, landmarks), alightLabel: p.alight && stopLabel(p.alight, landmarks) }));
  const common = (o) => ({ mode: o.mode, minutes: o.minutes, km: o.km, co2: o.co2, isExample: !!o.isExample, estimated: !!o.estimated, leaveAt: o.leaveAt, detail: o.detail ?? o });
  const list = base.flatMap((o) => (o.mode === 'bus' ? plans.map((p) => ({ ...o, ...p, mode: 'bus', detail: p })) : [o])).map(common);
  const extras = [...rentalOptions(trip, stations), ...carpoolOptions(trip, carRoute, rides, rideGeometries, landmarks, matchMinutes)];
  const all = [...list.filter((o) => o.mode !== 'car'), ...extras, ...list.filter((o) => o.mode === 'car')];
  const zero = { day: 0, week: 0, month: 0 };
  const options = all.map((o) => {
    const leaveAt = o.leaveAt ?? trip.hora;
    return {
      ...o, leaveAt, arriveAt: addMinutes(leaveAt, o.minutes),
      avoided: o.mode === 'car' ? zero : perPeriod(avoidedPerTrip(o.co2, carRoute.km), { tripsPerDay: trip.tripsPerDay, days: trip.dias }),
    };
  });
  return { options, best: bestBy(options.filter((o) => o.mode !== 'car')) };
}
