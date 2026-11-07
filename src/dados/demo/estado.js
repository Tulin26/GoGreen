                                                                                             
import { exampleRides } from '../../config/exemplos.js';

const KEY = 'gogreen-demo-v4';

function initial() {
  return {
    user: null,
    positions: [],
    cars: [],
    rides: exampleRides(),
    requests: [],
    dailyRoutes: [],
    chats: [],
    carpool: [],
    requestMessages: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {                                                 }
  return initial();
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {            }
}

export function resetState() {
  Object.assign(state, initial());
  save();
}

                                                        
export function reloadPositions() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state.positions = JSON.parse(raw).positions ?? [];
  } catch {            }
}
