import { BUS } from '../../config/transporte.js';
import { reloadPositions, save, state } from './estado.js';

export const onibusDemo = {
  async startTrip(line, direction) {
    if (!state.user) throw new Error('Entre na sua conta para informar o ônibus.');
    return { id: `trip-${Date.now()}`, token: crypto.randomUUID(), line, direction, pings: 0 };
  },
  async reportPosition(trip, lat, lng) {
    trip.pings += 1;
    state.positions = state.positions.filter((p) => p.token !== trip.token);
    state.positions.push({ token: trip.token, line_code: trip.line, direction: trip.direction, lat, lng, recorded_at: new Date().toISOString() });
    save();
  },
  async endTrip(trip) {
    state.positions = state.positions.filter((p) => p.token !== trip.token);
    save();
  },
  async listPositions() {
    reloadPositions();
    const limit = Date.now() - BUS.liveMaxAgeMin * 60000;
    return state.positions.filter((p) => new Date(p.recorded_at).getTime() > limit);
  },
};
