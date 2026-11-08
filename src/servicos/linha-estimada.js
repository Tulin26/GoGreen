import { PLACES } from '../config/lugares.js';
import { getRoutes } from './caminhos.js';
import { findPlace } from './enderecos.js';

const TERMINAL = PLACES.find((p) => p.title === 'Terminal Urbano').point;
const cache = new Map();

export function endQuery(line) {
  const back = line.directions[1]?.from;
  const name = !back || /^(Terminal|Bairro)$/i.test(back) ? line.name : back;
  return `${name.split('/')[0].replace(/\s+via\s+.*/i, '').trim()}, Araçatuba, SP`;
}

export function loadLinePath(line) {
  if (!cache.has(line.code)) {
    const job = (async () => {
      const end = await findPlace(endQuery(line));
      if (!end) return null;
      const [route] = await getRoutes('car', TERMINAL, end.point);
      return route.estimated ? null : { geometry: route.geometry, km: route.km, endName: end.title, endPoint: end.point };
    })().catch(() => null).then((r) => { if (!r) cache.delete(line.code); return r; });
    cache.set(line.code, job);
  }
  return cache.get(line.code);
}
