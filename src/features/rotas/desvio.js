import { CO2_G_PER_PKM } from '../../config/transporte.js';
import { haversine, projectOnPolyline } from '../../shared/mapa/geometria.js';

// Uma carona só faz sentido se o motorista leva a pessoa do embarque ao desembarque quase sem sair do caminho dele:
// os dois pontos ficam a poucos passos da rota dele, a rota cobre o trajeto da pessoa e o desvio é pequeno.
export const PREFILTER_M = 800;
export const MAX_DETOUR_KM = 1.5;
export const MAX_OPPOSITE_DETOUR_KM = 1;
const MIN_SHARED_RATIO = 0.5;
const ROAD_FACTOR = 1.3;

/** Desvio aproximado, em km, para o motorista passar por A e depois por B no caminho de from até to (em linha reta, com fator de rua). */
export function estimateExtraKm(from, to, a, b) {
  const meters = haversine(from, a) + haversine(a, b) + haversine(b, to) - haversine(from, to);
  return Math.max(0, (meters * ROAD_FACTOR) / 1000);
}

/** geometry: caminho do motorista (a reta de saída a destino, se o serviço de rotas não respondeu). passenger: { from, to }. */
export function prefilter(geometry, { from, to }, maxOffset = PREFILTER_M) {
  const a = projectOnPolyline(from, geometry);
  const b = projectOnPolyline(to, geometry);
  const sameDirection = a.along < b.along;
  const extraKm = estimateExtraKm(geometry[0], geometry.at(-1), from, to);
  const near = a.offset <= maxOffset && b.offset <= maxOffset;
  // Mesmo sentido: o trecho que o motorista percorre entre embarque e desembarque tem de cobrir a viagem da pessoa.
  const covers = sameDirection && b.along - a.along >= MIN_SHARED_RATIO * haversine(from, to);
  return { ok: near && (covers || (!sameDirection && extraKm <= MAX_OPPOSITE_DETOUR_KM)), sameDirection, extraKm, pickupOffsetM: a.offset, dropoffOffsetM: b.offset };
}

export { detourSummary } from '../../servicos/desvio.js';

export function costOf({ extraKm, sharedKm, kmPerLiter, gasPrice, perKm = gasPrice / kmPerLiter }) {
  const extraFuel = extraKm * perKm;
  return { extraFuel, suggestedShare: (sharedKm * perKm) / 2 + extraFuel };
}

export const co2Avoided = ({ passengerKm, extraKm }) => Math.max(0, CO2_G_PER_PKM.car * (passengerKm - extraKm));

export function analyze({ detour, passengerKm, perKm }) {
  const extraKm = detour?.extraKm ?? 0;
  const cost = costOf({ extraKm, sharedKm: passengerKm, perKm });
  return { calculated: Boolean(detour), extraKm, extraMin: detour?.extraMin ?? 0, extraFuel: cost.extraFuel, suggestedShare: cost.suggestedShare, co2: co2Avoided({ passengerKm, extraKm }) };
}
