import { fetchConsumo } from '../../servicos/consumo.js';

let promise = null;

const COLS = ['marca', 'modelo', 'versao', 'motor', 'combustivel', 'ciclo', 'km_e', 'km_g', 'co2_e', 'co2_g', 'kwh'];
export const toEntry = (row) => Object.fromEntries(COLS.map((c, i) => [c, row[i]]));

export const loadCatalog = () => (promise ??= fetchConsumo().then((rows) => rows.map(toEntry)));

const sortPt = (list) => [...new Set(list)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
export const brands = (catalog) => sortPt(catalog.map((c) => c.marca));
export const modelsOf = (catalog, marca) => sortPt(catalog.filter((c) => c.marca === marca).map((c) => c.modelo));

export function versionsOf(catalog, marca, modelo, ano) {
  const rows = catalog.filter((c) => c.marca === marca && c.modelo === modelo);
  if (!rows.length) return [];
  const cycles = rows.map((c) => c.ciclo);
  const target = Number(ano) || Math.max(...cycles);
  const nearest = cycles.reduce((best, c) => (Math.abs(c - target) < Math.abs(best - target) || (Math.abs(c - target) === Math.abs(best - target) && c > best) ? c : best));
  const seen = new Map();
  for (const r of rows.filter((c) => c.ciclo === nearest)) seen.set(`${r.versao}|${r.motor}|${r.combustivel}`, r);
  return [...seen.values()].sort((a, b) => `${a.versao}${a.motor}`.localeCompare(`${b.versao}${b.motor}`, 'pt-BR'));
}

export function carFieldsFromEntry(e) {
  const fuel = { F: 'flex', G: 'gasolina', E: 'etanol', D: 'diesel', V: 'eletrico' }[e.combustivel];
  const fields = { combustivel: fuel, origem_consumo: 'inmetro', versao: `${e.versao} ${e.motor}`.trim() || null };
  if (fuel === 'eletrico') return { ...fields, kwh_km: e.kwh };
  if (fuel === 'diesel') return { ...fields, km_l_diesel: e.km_g, co2_g_km_diesel: e.co2_g };
  return { ...fields, km_l_gasolina: e.km_g, km_l_etanol: e.km_e, co2_g_km_gasolina: e.co2_g, co2_g_km_etanol: e.co2_e };
}

export const normalizePlate = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isValidPlate = (s) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(s);
