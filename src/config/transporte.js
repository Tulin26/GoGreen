

export const CO2_G_PER_PKM = { car: 98.2, moto: 66, bus: 19.5, bike: 0, foot: 0 };

export const COST = {
  busFare: 5.3,
  busFareStudent: 2.65,
  gasPerLiter: 6.30,
  carKmPerLiter: 12,
  motoKmPerLiter: 35,
};

export const BUS = {
  kmh: 20,
  accessWalkMin: 10,
  waitMin: 10,
  liveMaxAgeMin: 3,
  pingSeconds: 15,
  tripMaxMin: 45,
  freshSec: 90,
};

export const FALLBACK = { detour: 1.3, kmh: { foot: 4.8, bike: 15, car: 30, moto: 30 } };

export const MAX_MINUTES = { foot: 45, bike: 60 };

export const MODES = {
  foot: { label: 'A pé',   icon: 'ape',    css: 'modo--ape',    the: 'A pé' },
  bike: { label: 'Bike',   icon: 'bike',   css: 'modo--bike',   the: 'A bike' },
  bus:  { label: 'Ônibus', icon: 'onibus', css: 'modo--onibus', the: 'O ônibus' },
  car:  { label: 'Carro',  icon: 'carro',  css: 'modo--carro',  the: 'O carro' },
  moto: { label: 'Moto',   icon: 'moto',   css: 'modo--moto',   the: 'A moto' },
};

export const WEIGHTS = { perReal: 1, perGram: 0.1 };

export const TRANSPORTES = [
  { key: 'carro', label: 'Carro', pref: 'hasCar' },
  { key: 'moto', label: 'Moto', pref: 'hasMoto' },
  { key: 'bike', label: 'Bike', pref: 'hasBike' },
  { key: 'onibus', label: 'Ônibus', pref: 'usesBus' },
  { key: 'ape', label: 'A pé', pref: 'walks' },
];
