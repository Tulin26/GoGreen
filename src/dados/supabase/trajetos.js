import { check } from './erros.js';

const toRoute = (d) => ({ ...d, from: [d.from_lat, d.from_lng], to: [d.to_lat, d.to_lng] });

export function trajetosSupabase(db) {
  return {
    async saveDailyRoute({ origem, destino, from, to, ida_hora, volta_hora, dias, oferece_carona, car_id, vagas }) {
      return check(await db.rpc('save_daily_route', {
        p_origem: origem, p_destino: destino, p_from_lat: from[0], p_from_lng: from[1], p_to_lat: to[0], p_to_lng: to[1],
        p_ida: ida_hora, p_volta: volta_hora || null, p_dias: dias, p_oferece: !!oferece_carona, p_car: car_id || null, p_vagas: vagas || null,
      }));
    },
    async listDailyRoutes() { return (check(await db.rpc('my_daily_routes')) ?? []).map(toRoute); },
    async deleteDailyRoute(id) { check(await db.rpc('delete_daily_route', { p_id: id })); },
    async matchDailyRides({ dias }) { return (check(await db.rpc('match_daily_rides', { p_dias: dias })) ?? []).map(toRoute); },
  };
}
