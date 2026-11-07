import { check, friendly } from './erros.js';

export function contaSupabase(db) {
  async function currentUser() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    const profile = check(await db.from('profiles').select('apelido, usuario, telefone, transportes, is_admin').eq('id', user.id).maybeSingle());
    return { id: user.id, email: user.email, apelido: profile?.apelido ?? 'Morador', usuario: profile?.usuario ?? null, telefone: profile?.telefone ?? null, transportes: profile?.transportes ?? [], is_admin: profile?.is_admin ?? false };
  }

  return {
    getUser: currentUser,
    onAuthChange(fn) {
      db.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                                                                                                
          setTimeout(async () => fn(await currentUser().catch(() => null)), 0);
        }
      });
    },
    async signUp({ email, password, apelido, usuario, telefone, transportes, carro }) {
      if (usuario && !check(await db.rpc('usuario_disponivel', { p_usuario: usuario }))) throw new Error('Esse usuário já existe. Escolha outro.');
      const data = check(await db.auth.signUp({ email, password, options: { data: { apelido, usuario, telefone, transportes, carro } } }));
      return { user: data.session ? await currentUser() : null, needsConfirmation: !data.session };
    },
    async signIn({ email: login, password }) {
                                                                                            
      const email = login.includes('@') ? login : check(await db.rpc('email_do_usuario', { p_usuario: login }));
      if (!email) throw new Error('E-mail, usuário ou senha incorretos.');
      check(await db.auth.signInWithPassword({ email, password }));
      return { user: await currentUser() };
    },
    async signOut() { check(await db.auth.signOut()); },
    async updateProfile({ apelido, usuario, telefone, transportes }) {
      const { data: { user } } = await db.auth.getUser();
      const { error } = await db.from('profiles').update({ apelido, usuario, telefone, transportes }).eq('id', user.id);
      if (error?.code === '23505') throw new Error('Esse usuário já existe. Escolha outro.');
      if (error) throw friendly(error);
    },
  };
}
