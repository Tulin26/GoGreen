import { BUS } from '../../config/transporte.js';
import { check } from './erros.js';

export function onibusRemoto(db) {
  return {
    async startTrip(line, direction) {
      const id = check(await db.rpc('start_bus_trip', { p_line: line, p_direction: direction }));
      return { id, line, direction };
    },
    async reportPosition(trip, lat, lng) {
      check(await db.rpc('report_bus_position', { p_trip: trip.id, p_lat: lat, p_lng: lng }));
    },
    async endTrip(trip) { check(await db.rpc('end_bus_trip', { p_trip: trip.id })); },
    async listPositions() {
      const since = new Date(Date.now() - BUS.liveMaxAgeMin * 60000).toISOString();
      const rows = check(await db.op('listPositions', { desde: since })) ?? [];
      const latest = new Map();
      for (const r of rows) if (!latest.has(r.token)) latest.set(r.token, r);
      return [...latest.values()];
    },
  };
}
