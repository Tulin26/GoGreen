
import { carrosDemo } from './carros.js';
import { contaDemo } from './conta.js';
import { onibusDemo } from './onibus.js';
import { caronaDemo } from './carona.js';
import { trajetosDemo } from './trajetos.js';

export const demoStore = { mode: 'demo', ...contaDemo, ...onibusDemo, ...carrosDemo, ...trajetosDemo, ...caronaDemo };
