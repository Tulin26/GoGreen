import { check } from './erros.js';

export function carrosRemoto(db) {
  return {
    async listCars() {
      return check(await db.op('listCars'));
    },
    async addCar(car) {
      return check(await db.op('addCar', { car }));
    },
    async deleteCar(id) { check(await db.rpc('delete_vehicle_and_routes', { p_vehicle: id })); },
  };
}
