import { demoStore } from './demo/index.js';
import { createRemoteStore } from './remoto/index.js';

// VITE_USAR_BANCO=1 liga o servidor (api/) com o banco Neon. Sem ela, o app roda em modo demonstração, com dados só no navegador.
export const store = import.meta.env.VITE_USAR_BANCO === '1' ? createRemoteStore() : demoStore;
export const isDemo = store.mode === 'demo';
