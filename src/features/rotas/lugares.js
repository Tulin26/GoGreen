import { PLACES } from '../../config/lugares.js';
import { normalize } from '../../shared/texto.js';

export function findLocalPlaces(query) {
  const q = normalize(query);
  if (q.length < 3) return [];
  return PLACES.filter((p) => p.terms.some((t) => q.includes(t) || (t.includes(q) && q.length >= 4)));
}
