
import { TRANSPORTES } from '../config/transporte.js';

const KEY = 'gogreen-prefs';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

export const prefs = {
  get: (name, fallback) => read()[name] ?? fallback,
  set(name, value) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [name]: value })); } catch {}
  },

  clearTransportes() {
    try {
      const all = read();
      TRANSPORTES.forEach((t) => delete all[t.pref]);
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  },
};
