import { fetchDoSite } from './site.js';

export async function fetchConsumo() {
  const json = await fetchDoSite('/dados/consumo.json?v=2', { timeoutMs: 60000, isValid: (j) => j.carros?.length > 0 });
  return json?.carros ?? [];
}
