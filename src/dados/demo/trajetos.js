import { EXAMPLE_DAILY_RIDES } from '../../config/exemplos.js';
import { addExampleIncoming } from './carona.js';
import { save, state } from './estado.js';

let seq = 0;

export const trajetosDemo = {
  async saveDailyRoute(route) {
    if (!route.dias?.length) throw new Error('Marque pelo menos um dia da semana.');
    if (route.oferece_carona && (!route.car_id || !route.vagas)) throw new Error('Escolha o veículo e as vagas.');
    const vehicle = state.cars.find((c) => c.id === route.car_id);
    if (route.oferece_carona && vehicle?.tipo === 'moto' && route.vagas > 1) throw new Error('A carona de moto permite uma vaga.');
    const saved = { ...route, id: `trajeto-${Date.now()}-${++seq}`, vagas: route.vagas ?? null, ride_id: null, papel: route.oferece_carona ? 'motorista' : 'passageiro' };
    state.dailyRoutes = [...(state.dailyRoutes ?? []), saved];
    if (saved.papel === 'motorista') addExampleIncoming(saved);
    save();
    return saved.id;
  },
  async listDailyRoutes() { return state.dailyRoutes ?? []; },
  async deleteDailyRoute(id) {
    state.dailyRoutes = (state.dailyRoutes ?? []).filter((r) => r.id !== id);
    state.carpool = (state.carpool ?? []).filter((r) => r.driver_route.id !== id && r.passenger_route.id !== id);
    save();
  },

  async matchDailyRides({ dias }) { return EXAMPLE_DAILY_RIDES.filter((r) => r.dias.some((d) => dias.includes(d))).map((r) => ({ ...r, veiculo: r.veiculo ?? 'Carro de exemplo', papel: 'motorista' })); },
};
