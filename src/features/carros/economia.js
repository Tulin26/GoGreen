
import { FOSSIL_G_PER_LITER, FUELS } from '../../config/combustiveis.js';

export const fuelsOf = (car) => (car.combustivel === 'flex' ? ['gasolina', 'etanol'] : [car.combustivel]);

export const kmPerLiter = (car, fuel) => Number(car[`km_l_${fuel}`]) || null;

export function co2PerKm(car, fuel) {
  if (fuel === 'eletrico') return 0;
  const known = car[`co2_g_km_${fuel}`];
  if (known !== null && known !== undefined && known !== '') return Number(known);
  const kml = kmPerLiter(car, fuel);
  return kml ? FOSSIL_G_PER_LITER[fuel] / kml : null;
}

export const carLabel = (car) => `${car.modelo} ${car.ano}`;

export function tripChoices(cars, km, prices) {
  const out = [];
  for (const car of cars) {
    if (car.tipo === 'moto') continue;
    for (const fuel of fuelsOf(car)) {
      const price = prices[fuel];
      const kml = kmPerLiter(car, fuel);
      const kwh = fuel === 'eletrico' ? Number(car.kwh_km) || null : null;
      if (!price || (!kml && !kwh)) continue;
      const money = kwh ? km * kwh * price : (km / kml) * price;
      out.push({ car, fuel, fuelLabel: FUELS[fuel].label, kml, kwh, price, money, co2: (co2PerKm(car, fuel) ?? 0) * km });
    }
  }
  return out.sort((a, b) => a.money - b.money || a.co2 - b.co2);
}
