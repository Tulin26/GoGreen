import { tripChoices } from '../carros/economia.js';
import { busMinutes, co2For, moneyFor, pickAlternative } from './recomendacao.js';

export function buildOptions(routes, p, { cars = [], prices = null } = {}) {
  const money = (m, km) => moneyFor(m, km, { student: p.student, gasPrice: prices?.gasolina });
  const foot = pickAlternative(routes.foot);
  const bike = pickAlternative(routes.bike);
  const carRoute = routes.car[0];
  const build = (mode, r, minutes = r.minutes) => ({ ...r, mode, minutes, money: money(mode, r.km), co2: co2For(mode, r.km) });
  const car = build('car', carRoute);
  const moto = build('moto', carRoute);
  const choices = prices ? tripChoices(cars, carRoute.km, prices) : [];
  if (choices.length) {
    car.money = choices[0].money;

    if (!['etanol', 'eletrico'].includes(choices[0].fuel)) car.co2 = choices[0].co2;
    car.choice = choices[0];
    car.otherChoices = choices.slice(1);
  }
  return [
    build('foot', foot),
    build('bike', bike),
    build('bus', carRoute, busMinutes(carRoute.km)),
    car,
    moto,
  ];
}
