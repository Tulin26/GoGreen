import { save, state } from './estado.js';

                                                                                                       
const REPLIES = [
  'Oi! Pode ser sim. Costumo dividir a gasolina: R$ 5 por trecho. Fechado?',
  'Combinado. Te espero no ponto de encontro cinco minutos antes.',
  'Beleza! (resposta automática da demonstração)',
];

const threadOf = (rideId) => (state.chats ?? []).filter((m) => m.ride_id === rideId);

export const chatDemo = {
  async listChatMessages(rideId) {
    return threadOf(rideId).map(({ id, mine, autor, body, created_at }) => ({ id, mine, autor, body, created_at }));
  },
  async sendChatMessage(rideId, passengerId, body, context = {}) {
    if (!state.user) throw new Error('Entre na sua conta para conversar.');
    const text = String(body ?? '').trim();
    if (!text) throw new Error('Escreva uma mensagem.');
    if (text.length > 500) throw new Error('Mensagem longa demais (máximo 500 letras).');
    const now = Date.now();
    const base = { ride_id: rideId, origem: context.origem ?? '', destino: context.destino ?? '', outro: context.outro ?? 'Motorista de exemplo' };
    const mine = { ...base, id: `msg-${now}`, mine: true, autor: state.user.apelido, body: text, created_at: new Date(now).toISOString() };
    const answers = threadOf(rideId).filter((m) => !m.mine).length;
    const reply = { ...base, id: `msg-${now}-r`, mine: false, autor: base.outro, body: REPLIES[Math.min(answers, REPLIES.length - 1)], created_at: new Date(now + 1000).toISOString() };
    state.chats = [...(state.chats ?? []), mine, reply];
    save();
    return mine.id;
  },
  async listChats() {
    const ids = [...new Set((state.chats ?? []).map((m) => m.ride_id))];
    return ids.map((rideId) => {
      const msgs = threadOf(rideId);
      const last = msgs.at(-1);
      return { ride_id: rideId, passenger_id: null, sou_motorista: false, outro: last.outro, origem: last.origem, destino: last.destino, ultima: last.body, ultima_em: last.created_at };
    }).sort((a, b) => b.ultima_em.localeCompare(a.ultima_em));
  },
};
