import { getRouteVia, getRoutes } from './caminhos.js';

export const detourSummary = (base, via) => ({ extraKm: Math.max(0, via.km - base.km), extraMin: Math.max(0, via.minutes - base.minutes) });

export async function detourFor(driver, passenger) {
  const [base] = await getRoutes('car', driver.from, driver.to);
  if (base.estimated) return null;
  const withPassenger = await getRouteVia(driver.from, driver.to, [passenger.from, passenger.to]);
  if (!withPassenger) return null;
  return { ...detourSummary(base, withPassenger), base, withPassenger };
}
