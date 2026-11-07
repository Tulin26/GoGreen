import { check } from './erros.js';

const CAR_COLUMNS = 'id, tipo, marca, modelo, versao, ano, placa, combustivel, km_l_gasolina, km_l_etanol, km_l_diesel, co2_g_km_gasolina, co2_g_km_etanol, co2_g_km_diesel, kwh_km, origem_consumo';

export function carrosSupabase(db) {
  return {
    async listCars() {
      return check(await db.from('user_cars').select(CAR_COLUMNS).order('created_at'));
    },
    async addCar(car) {
      return check(await db.from('user_cars').insert(car).select(CAR_COLUMNS).single());
    },
    async deleteCar(id) { check(await db.rpc('delete_vehicle_and_routes', { p_vehicle: id })); },
  };
}
