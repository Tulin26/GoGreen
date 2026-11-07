import { fetchDoSite } from './site.js';

                                                                                                             
export function parseOverpass(json) {
  return (json?.elements ?? [])
    .filter((e) => e.type === 'node' && Number.isFinite(e.lat) && Number.isFinite(e.lon))
    .map((e) => ({ id: e.id, coords: [e.lat, e.lon], nome: e.tags?.name ?? null }));
}

                                                                                                 
export async function loadBusStops() {
  const json = await fetchDoSite('/dados/pontos-onibus.json', { isValid: (j) => Array.isArray(j.pontos) });
  return json?.pontos ?? [];
}
