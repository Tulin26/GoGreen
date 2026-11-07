import { BUS, CO2_G_PER_PKM, COST, MAX_MINUTES, WEIGHTS } from '../../config/transporte.js';

export function isNight(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(date));
  return h >= 18 || h < 6;
}

export function moneyFor(mode, km, { student = false, gasPrice = COST.gasPerLiter } = {}) {
  if (mode === 'car') return (km / COST.carKmPerLiter) * gasPrice;
  if (mode === 'moto') return (km / COST.motoKmPerLiter) * gasPrice;
  if (mode === 'bus') return student ? COST.busFareStudent : COST.busFare;
  return 0;
}

export const co2For = (mode, km) => CO2_G_PER_PKM[mode] * km;

                                                                                               
export const busMinutes = (km) => (km / BUS.kmh) * 60 + BUS.accessWalkMin + BUS.waitMin;

                                                                  
export const pickAlternative = (alternatives) => alternatives.reduce((a, b) => (b.minutes < a.minutes ? b : a));

export const baseScore = (o) => o.minutes + o.money * WEIGHTS.perReal + o.co2 * WEIGHTS.perGram;

                                                                                   
export function isCandidate(option, { hasBike = false, hasCar = false, hasMoto = false, accessible = false, usesBus = true, walks = true } = {}) {
                                                                                        
  if (option.mode === 'foot') return walks && Math.round(option.minutes) <= MAX_MINUTES.foot;
  if (option.mode === 'bike') return hasBike && !accessible && Math.round(option.minutes) <= MAX_MINUTES.bike;
  if (option.mode === 'car') return hasCar;
  if (option.mode === 'moto') return hasMoto;
  return usesBus;
}

   
                                                                                   
   
export function rankOptions(options, prefs = {}) {
  const order = (a, b) => baseScore(a) - baseScore(b) || a.co2 - b.co2;
  const candidates = options.filter((o) => isCandidate(o, prefs));
  const pool = candidates.length ? candidates : options;
  const best = [...pool].sort(order)[0];
  const others = options.filter((o) => o !== best).sort((a, b) => {
    const ca = isCandidate(a, prefs) ? 0 : 1;
    const cb = isCandidate(b, prefs) ? 0 : 1;
    return ca - cb || order(a, b);
  });
  return { best, others };
}

                                                                   
export function bestMetrics(options) {
  const min = (key) => Math.min(...options.map((o) => o[key]));
  const close = (a, b) => Math.abs(a - b) < 0.5;
  const minutes = min('minutes');
  const money = min('money');
  const co2 = min('co2');
  return {
    minutes: (o) => close(o.minutes, minutes),
    money: (o) => Math.abs(o.money - money) < 0.005,
    co2: (o) => close(o.co2, co2),
  };
}
