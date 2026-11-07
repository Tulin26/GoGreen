import { check } from './erros.js';

const toRoute = (j) => ({ ...j, from: [j.from_lat, j.from_lng], to: [j.to_lat, j.to_lng] });
const toRequest = (r) => ({ ...r, driver_route: toRoute(r.driver_route), passenger_route: toRoute(r.passenger_route) });

export function caronaRemoto(db) {
  return {
    async requestCarpool({ driverRouteId, passengerRouteId, mensagem }) {
      return check(await db.rpc('request_carpool', { p_driver_route: driverRouteId, p_passenger_route: passengerRouteId, p_mensagem: mensagem ?? null }));
    },
    async listCarpoolRequests() { return (check(await db.rpc('my_carpool_requests')) ?? []).map(toRequest); },
    async respondCarpoolRequest(id, aceitar) { check(await db.rpc('respond_carpool_request', { p_request: id, p_aceitar: aceitar })); },
    async cancelCarpoolRequest(id) { check(await db.rpc('cancel_carpool_request', { p_request: id })); },
    async listRequestMessages(id) { return check(await db.rpc('list_request_messages', { p_request: id })) ?? []; },
    async sendRequestMessage(id, body) { return check(await db.rpc('send_request_message', { p_request: id, p_body: body })); },
  };
}
