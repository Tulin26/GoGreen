import { carrosDemo } from './carros.js';
import { resetState, save, state } from './estado.js';

let authListener = () => {};

export const contaDemo = {
  async getUser() { return state.user; },
  onAuthChange(fn) { authListener = fn; },
  async signUp({ apelido, telefone, transportes = [], carro }) {
    state.user = { id: 'demo-user', apelido: apelido || 'Visitante', telefone: telefone || null, transportes, is_admin: true };
    if (carro) await carrosDemo.addCar(carro);
    save(); authListener(state.user);
    return { user: state.user };
  },
  async signIn() {
    state.user = state.user ?? { id: 'demo-user', apelido: 'Visitante', telefone: null, transportes: [], is_admin: true };
    save(); authListener(state.user);
    return { user: state.user };
  },
  async signOut() { state.user = null; save(); authListener(null); },
  async updateProfile({ apelido, usuario, telefone, transportes }) {
    state.user = { ...state.user, apelido, usuario, telefone, transportes };
    save(); authListener(state.user);
  },
  async reset() { resetState(); authListener(null); },
};
