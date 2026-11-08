import { FALLBACK } from '../config/transporte.js';
import { haversine } from '../shared/mapa/geometria.js';

// Rotas pelas ruas do OpenStreetMap (OSRM, serviço gratuito e sem chave). Sem resposta, cai para a reta, marcada como estimativa.
const SERVIDOR = 'https://routing.openstreetmap.de';
const PERFIL = { foot: 'foot', bike: 'bike', car: 'car', moto: 'car' };
const cache = new Map();

export function parseRoutes(resposta) {
  const routes = resposta?.routes ?? [];
  if (resposta?.code !== 'Ok' || !routes.length) throw new Error('NoRoute');
  return routes.map((r) => ({
    km: r.distance / 1000,
    minutes: r.duration / 60,
    geometry: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    estimated: false,
  }));
}

export function straightLine(mode, from, to) {
  const km = (haversine(from, to) / 1000) * FALLBACK.detour;
  return [{ km, minutes: (km / FALLBACK.kmh[mode]) * 60, geometry: [from, to], estimated: true }];
}

/** points: [[lat, lng], ...] na ordem do percurso. */
async function pedir(perfil, points, { alternatives = false, signal } = {}) {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${SERVIDOR}/routed-${perfil}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}`;
  const resposta = await fetch(url, { signal });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return parseRoutes(await resposta.json());
}

export async function getRoutes(mode, from, to, { signal, alternatives = false } = {}) {
  const wantAlternatives = mode === 'car' && alternatives;
  const key = `${mode}|${from.map((n) => n.toFixed(6))}|${to.map((n) => n.toFixed(6))}|${wantAlternatives}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const routes = await pedir(PERFIL[mode], [from, to], { alternatives: wantAlternatives, signal });
    cache.set(key, routes);
    return routes;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return straightLine(mode, from, to);
  }
}

/** Rota de carro passando por todos os pontos de via, nessa ordem. Null se não der para calcular. */
export async function getRouteVia(from, to, via) {
  const key = `via|${[from, ...via, to].map((p) => p.map((n) => n.toFixed(6))).join('>')}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const [route] = await pedir('car', [from, ...via, to]);
    cache.set(key, route);
    return route;
  } catch {
    return null;
  }
}
