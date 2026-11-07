import { check } from './erros.js';

export function contaRemoto(db) {
  const ouvintes = [];
  const avisa = (usuario) => ouvintes.forEach((fn) => fn(usuario));

  async function usuarioAtual() {
    return check(await db.auth('eu')).usuario;
  }

  return {
    getUser: usuarioAtual,
    onAuthChange(fn) { ouvintes.push(fn); },
    async signUp({ email, password, apelido, usuario, telefone, transportes, carro }) {
      const { usuario: user } = check(await db.auth('cadastro', { email, password, apelido, usuario, telefone, transportes, carro }));
      avisa(user);
      return { user };
    },
    async signIn({ email: login, password }) {
      const { usuario: user } = check(await db.auth('entrar', { login, password }));
      avisa(user);
      return { user };
    },
    async signOut() { check(await db.auth('sair')); avisa(null); },
    async deleteAccount() { check(await db.rpc('delete_my_account')); avisa(null); },
    async updateProfile({ apelido, usuario, telefone, transportes }) {
      check(await db.op('updateProfile', { perfil: { apelido, usuario, telefone, transportes } }));
      avisa(await usuarioAtual());
    },
  };
}
