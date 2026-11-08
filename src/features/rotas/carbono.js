import { CO2_G_PER_PKM } from '../../config/transporte.js';
import { MONTH_WEEKS } from '../../config/trajeto.js';

export const carpoolCo2 = (carKm, occupants) => (CO2_G_PER_PKM.car * carKm) / Math.max(2, occupants);

export const avoidedPerTrip = (optionCo2, carKm) => Math.max(0, CO2_G_PER_PKM.car * carKm - optionCo2);

export function perPeriod(gramsPerTrip, { tripsPerDay, days }) {
  if (!days.length) return { day: 0, week: 0, month: 0 };
  const day = gramsPerTrip * tripsPerDay;
  const week = day * days.length;
  return { day, week, month: Math.round(week * MONTH_WEEKS * 100) / 100 };
}

export function bestBy(options) {
  const by = (key) => options.reduce((best, o) => (o[key] < best[key] ? o : best), options[0]);
  return { lowestCo2: by('co2'), fastest: by('minutes') };
}
