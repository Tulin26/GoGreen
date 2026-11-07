import { ELECTRICITY_PER_KWH, FALLBACK_PRICES } from '../config/combustiveis.js';
import { fetchDoSite } from './site.js';

let cached = null;
const withElectricity = (p) => ({ ...p, precos: { ...p.precos, eletrico: ELECTRICITY_PER_KWH } });

                                                                                                 
export async function getFuelPrices() {
  if (cached) return cached;
  const live = await fetchDoSite('/api/combustiveis', { isValid: (json) => Boolean(json.precos?.gasolina) });
  if (live) cached = withElectricity(live);
  return cached ?? withElectricity(FALLBACK_PRICES);
}
