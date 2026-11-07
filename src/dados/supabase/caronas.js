import { check } from './erros.js';

export function caronasSupabase(db) {
  return {
    async listRides() { return check(await db.rpc('list_rides')); },
    async listRideRequests() { return check(await db.rpc('my_ride_requests')); },
    async offerRide({ car_id, origem, destino, saida_em, vagas, observacao }) {
      return check(await db.rpc('offer_ride', { p_car: car_id, p_origem: origem, p_destino: destino, p_saida: saida_em, p_vagas: vagas, p_observacao: observacao }));
    },
    async cancelRide(id) { check(await db.rpc('cancel_ride', { p_ride: id })); },
    async requestRide(id, mensagem) { return check(await db.rpc('request_ride', { p_ride: id, p_mensagem: mensagem })); },
    async cancelRequest(id) { check(await db.rpc('cancel_request', { p_request: id })); },
    async respondRequest(id, aceitar) { check(await db.rpc('respond_request', { p_request: id, p_aceitar: aceitar })); },
  };
}
