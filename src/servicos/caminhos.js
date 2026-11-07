import { FALLBACK } from '../config/transporte.js';
import { haversine } from '../shared/mapa/geometria.js';
import { importLibrary } from '../shared/mapa/google.js';

                                                                                                        
                                                                                                       
const TRAVEL_MODE = { foot: 'WALKING', bike: 'BICYCLING', car: 'DRIVING', moto: 'DRIVING' };
const cache = new Map();

                                                                                                
export function parseRoutes(result) {
  const routes = result?.routes ?? [];
  if (!routes.length) throw new Error('NoRoute');
  return routes.map((r) => ({
    km: r.distanceMeters / 1000,
    minutes: r.durationMillis / 60000,
    geometry: r.path.map((p) => [p.lat, p.lng]),
    estimated: false,
  }));
}

export function straightLine(mode, from, to) {
  const km = (haversine(from, to) / 1000) * FALLBACK.detour;
  return [{ km, minutes: (km / FALLBACK.kmh[mode]) * 60, geometry: [from, to], estimated: true }];
}

   
                                                                                                          
                                                                                      
   
export async function getRoutes(mode, from, to, { signal, alternatives = false } = {}) {
  const wantAlternatives = mode === 'car' && alternatives;
  const key = `${mode}|${from.map((n) => n.toFixed(6))}|${to.map((n) => n.toFixed(6))}|${wantAlternatives}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const { Route } = await importLibrary('routes');
    const result = await Route.computeRoutes({
      origin: { lat: from[0], lng: from[1] },
      destination: { lat: to[0], lng: to[1] },
      travelMode: TRAVEL_MODE[mode],
      computeAlternativeRoutes: wantAlternatives,
      fields: ['path', 'distanceMeters', 'durationMillis'],
    });
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const routes = parseRoutes(result);
    cache.set(key, routes);
    return routes;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return straightLine(mode, from, to);
  }
}

   
                                                                                                      
                                                                                                                                
   
export async function getRouteVia(from, to, via) {
  const key = `via|${[from, ...via, to].map((p) => p.map((n) => n.toFixed(6))).join('>')}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const { Route } = await importLibrary('routes');
    const result = await Route.computeRoutes({
      origin: { lat: from[0], lng: from[1] }, destination: { lat: to[0], lng: to[1] },
      intermediates: via.map((p) => ({ location: { lat: p[0], lng: p[1] } })),
      travelMode: 'DRIVING', fields: ['path', 'distanceMeters', 'durationMillis'],
    });
    const [route] = parseRoutes(result);
    cache.set(key, route);
    return route;
  } catch {
    return null;
  }
}
