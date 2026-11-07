import { haversine } from '../../shared/mapa/geometria.js';

const MIN_LEG_M = 30;
const LABEL = { foot: 'a pé', bike: 'de bicicleta', car: 'de carro', moto: 'de moto', bus: 'de ônibus' };
const m = (x) => `${Math.round(x)} m`;
const far = (a, b) => haversine(a, b) >= MIN_LEG_M;

function nearestIndex(point, line) {
  let best = 0;
  line.forEach((v, i) => { if (haversine(point, v) < haversine(point, line[best])) best = i; });
  return best;
}

                                                                               
function slice(geometry, a, b) {
  const i = nearestIndex(a, geometry);
  const j = nearestIndex(b, geometry);
  return i < j ? geometry.slice(i, j + 1) : [a, b];
}

   
                                                                                           
                                                                                                                
                                                                                                                                    
   
export async function buildLegs(option, trip, route) {
  const d = option.detail ?? option;
  const walk = async (from, to, step) => {
    if (!far(from, to)) return null;
    const r = await route('foot', from, to);
    return { mode: 'foot', geometry: r.geometry, km: r.km, minutes: r.minutes, step };
  };
  const done = (legs, markers) => { const kept = legs.filter(Boolean); return { legs: kept, markers, steps: kept.map((l) => l.step) }; };

  if (option.mode === 'bikeRental') {
    const toStation = await walk(trip.from, d.from.coords, `Caminhe ${m(haversine(trip.from, d.from.coords))} até a estação ${d.from.nome} (exemplo).`);
    const ride = await route('bike', d.from.coords, d.to.coords);
    const fromStation = await walk(d.to.coords, trip.to, `Devolva a bicicleta e caminhe ${m(haversine(d.to.coords, trip.to))} até o destino.`);
    const pedal = { mode: 'bike', geometry: ride.geometry, km: ride.km, minutes: ride.minutes, step: `Pegue a bicicleta e pedale ${ride.km.toFixed(1).replace('.', ',')} km até a estação ${d.to.nome}.` };
    return done([toStation, pedal, fromStation], [{ point: d.from.coords, label: d.from.nome }, { point: d.to.coords, label: d.to.nome }]);
  }

  if (option.mode === 'carpool') {
    const where = d.meeting || 'o ponto de encontro';
    const ride = `Vá de carro com ${d.ride.motorista}${d.drop ? ` até ${d.drop}` : ''}.`;
    const toDriver = await walk(trip.from, d.boardPoint, `Caminhe ${m(haversine(trip.from, d.boardPoint))} até ${where} e esteja lá às ${d.ride.hora}.`);
                                                                                                       
    const car = { mode: 'car', geometry: slice(d.geometry, d.boardPoint, d.alightPoint), km: option.km, minutes: null, step: toDriver ? ride : `Esteja em ${where} às ${d.ride.hora}. ${ride}` };
    const toDest = await walk(d.alightPoint, trip.to, `Caminhe ${m(haversine(d.alightPoint, trip.to))} até o destino.`);
    return done([toDriver, car, toDest], [{ point: d.boardPoint, label: `Encontro com ${d.ride.motorista}` }, { point: d.alightPoint, label: 'Desembarque' }]);
  }

  if (option.mode === 'bus' && d.board && d.alight) {
    const toStop = await walk(trip.from, d.board.coords, `Caminhe ${m(haversine(trip.from, d.board.coords))} até o ${d.boardLabel}.`);
    const bus = { mode: 'bus', geometry: slice(d.geometry, d.board.coords, d.alight.coords), km: option.km, minutes: null, step: `Pegue o ônibus e desça no ${d.alightLabel} (trajeto estimado, passa por ${d.stopsPassed.length} pontos).` };
    const toDest = await walk(d.alight.coords, trip.to, `Caminhe ${m(haversine(d.alight.coords, trip.to))} até o destino.`);
    const last = d.stopsPassed.length - 1;
    return done([toStop, bus, toDest], d.stopsPassed.map((s, i) => ({ point: s.coords, label: i === 0 ? d.boardLabel : i === last ? d.alightLabel : 'Ponto de ônibus' })));
  }

  return done([{ mode: option.mode, geometry: d.geometry, km: option.km, minutes: option.minutes, step: `Siga ${LABEL[option.mode] ?? ''} até o destino.` }], []);
}
