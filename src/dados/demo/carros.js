import { save, state } from './estado.js';

export const carrosDemo = {
  async listCars() { return state.cars; },
  async addCar(car) {
    if (state.cars.length >= 10) throw new Error('Limite de 10 veículos por pessoa.');
    if (state.cars.some((c) => c.placa === car.placa)) throw new Error('duplicate');
    const saved = { id: `carro-${Date.now()}`, versao: null, km_l_gasolina: null, km_l_etanol: null, km_l_diesel: null, kwh_km: null, co2_g_km_gasolina: null, co2_g_km_etanol: null, co2_g_km_diesel: null, ...car };
    state.cars = [...state.cars, saved];
    save();
    return saved;
  },
  async deleteCar(id) {
    const routeIds = new Set((state.dailyRoutes ?? []).filter((r) => r.car_id === id).map((r) => r.id));
    const requestIds = new Set((state.carpool ?? [])
      .filter((r) => routeIds.has(r.driver_route?.id) || routeIds.has(r.passenger_route?.id))
      .map((r) => r.id));
    state.dailyRoutes = (state.dailyRoutes ?? []).filter((r) => !routeIds.has(r.id));
    state.carpool = (state.carpool ?? []).filter((r) => !requestIds.has(r.id));
    state.requestMessages = (state.requestMessages ?? []).filter((m) => !requestIds.has(m.request_id));
    state.cars = state.cars.filter((c) => c.id !== id);
    save();
  },
};
