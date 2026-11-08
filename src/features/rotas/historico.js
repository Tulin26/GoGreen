import { prefs } from '../../shared/preferencias.js';

const CHAVE = 'historico-lugares';
export const MAX_HISTORICO = 8;

const valido = (l) => l && typeof l.title === 'string' && Array.isArray(l.point) && l.point.length === 2 && l.point.every(Number.isFinite);
// Mesmo lugar: mesmo nome e a menos de ~10 m de diferença.
const igual = (a, b) => a.title === b.title && Math.abs(a.point[0] - b.point[0]) < 1e-4 && Math.abs(a.point[1] - b.point[1]) < 1e-4;

/** Devolve a lista nova: o lugar vai para o topo, sem repetir, e a lista nunca passa de MAX_HISTORICO. */
export function addToHistory(lista, lugar) {
  if (!valido(lugar)) return lista;
  const novo = { title: lugar.title, subtitle: lugar.subtitle ?? '', point: lugar.point };
  return [novo, ...lista.filter((l) => !igual(l, novo))].slice(0, MAX_HISTORICO);
}

export const loadHistory = () => (Array.isArray(prefs.get(CHAVE, [])) ? prefs.get(CHAVE, []).filter(valido) : []);
export const rememberPlace = (lugar) => prefs.set(CHAVE, addToHistory(loadHistory(), lugar));
export const clearHistory = () => prefs.set(CHAVE, []);
