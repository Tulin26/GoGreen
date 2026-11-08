import { EXAMPLE_BIKE_STATIONS } from '../../config/exemplos.js';
import { PLACES } from '../../config/lugares.js';
import { store } from '../../dados/index.js';
import { getRoutes } from '../../servicos/caminhos.js';
import { loadBusStops } from '../../servicos/pontos-onibus.js';
import { buildDailyOptions } from './opcoes-trajeto.js';

const MAX_DRIVERS = 5;

const SEARCH_WINDOW_MIN = 120;

export const nowHHMM = (d = new Date()) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).format(d);

export const landmarksOf = (stops) => [
  ...PLACES.map((p) => ({ nome: p.title, coords: p.point })),
  ...stops.filter((s) => s.nome).map((s) => ({ nome: `ponto ${s.nome}`, coords: s.coords })),
  ...EXAMPLE_BIKE_STATIONS.map((s) => ({ nome: `estação ${s.nome}`, coords: s.coords })),
];

export async function loadExtraInputs(trip, { signal } = {}) {
  const [stops, rides] = await Promise.all([loadBusStops(), store.matchDailyRides({ dias: trip.dias }).catch(() => [])]);
  const rideGeometries = {};
  for (const ride of rides.slice(0, MAX_DRIVERS)) {
    const [route] = await getRoutes('car', ride.from, ride.to, { signal });
    rideGeometries[ride.id] = route.geometry;
  }
  return { stops, rides, rideGeometries };
}

export function extraOptions({ routes, input, prefs, cars, prices, trip }) {
  const { options } = buildDailyOptions({
    routes: { foot: routes.foot, bike: routes.bike, car: [routes.car[0]] }, busCandidates: routes.car,
    ...input, prefs, cars, prices, landmarks: landmarksOf(input.stops), trip, matchMinutes: SEARCH_WINDOW_MIN,
  });
  return options.filter((o) => o.mode === 'bikeRental' || o.mode === 'carpool' || (o.mode === 'bus' && o.detail.board));
}
