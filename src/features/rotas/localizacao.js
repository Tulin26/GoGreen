import { loadRuas, nearestAddress } from '../../servicos/enderecos-locais.js';

export const fmtAccuracy = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);

/** Nome da rua onde a pessoa está: com GPS bom, rua e número; com sinal médio, "Perto de" a rua; senão, o texto genérico. */
export async function placeName(point, accuracy) {
  if (accuracy > 400) return 'Minha localização';
  const rua = nearestAddress(point, await loadRuas(), accuracy <= 150 ? 150 : 300);
  if (!rua) return 'Minha localização';
  return accuracy <= 150 ? rua.title : `Perto de ${rua.street}`;
}
