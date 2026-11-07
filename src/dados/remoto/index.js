// Modo real: servidor em api/ com o banco Neon. Tem a mesma interface do modo demonstração.
import { carrosRemoto } from './carros.js';
import { contaRemoto } from './conta.js';
import { onibusRemoto } from './onibus.js';
import { caronaRemoto } from './carona.js';
import { trajetosRemoto } from './trajetos.js';
import { criarCliente } from './chamada.js';

export function createRemoteStore(fetchFn) {
  const db = criarCliente(fetchFn);
  return { mode: 'remoto', ...contaRemoto(db), ...onibusRemoto(db), ...carrosRemoto(db), ...trajetosRemoto(db), ...caronaRemoto(db) };
}
