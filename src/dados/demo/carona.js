import { EXAMPLE_DAILY_RIDES } from '../../config/exemplos.js';
import { save, state } from './estado.js';

const ACCEPT_AFTER_MS = 8000;
const REPLIES = {
  passageiro: ['Oi! Pode ser sim. Costumo dividir a gasolina: R$ 5 por trecho. Fechado?', 'Combinado. Te espero no ponto de encontro cinco minutos antes.', 'Beleza! (resposta automática da demonstração)'],
  motorista: ['Oi! Fica ótimo para mim. Posso dividir o combustível.', 'Combinado! Estarei no ponto de embarque no horário.', 'Beleza! (resposta automática da demonstração)'],
};
let seq = 0;
const nextId = (prefix) => `${prefix}-${Date.now()}-${++seq}`;

const offset = (p, northM, eastM) => [p[0] + northM / 111320, p[1] + eastM / (111320 * Math.cos((p[0] * Math.PI) / 180))];
const asRoute = (r) => ({ id: r.id, origem: r.origem, destino: r.destino, from: r.from, to: r.to, hora: r.ida_hora ?? r.hora, volta: r.volta_hora ?? null, dias: r.dias });
const needLogin = (what) => { if (!state.user) throw new Error(`Entre na sua conta para ${what}.`); };

export function addExampleIncoming(driverRoute) {
  state.carpool = [...(state.carpool ?? []), {
    id: nextId('pedido-ex'), papel: 'motorista', status: 'pendente', mensagem: 'Oi! Posso ir com você?', created_at: new Date(Date.now()).toISOString(),
    outro: 'Passageiro de exemplo', isExample: true, driver_route: asRoute(driverRoute),
    passenger_route: { id: nextId('rota-ex'), origem: 'Perto da sua origem (exemplo)', destino: 'Perto do seu destino (exemplo)', from: offset(driverRoute.from, 700, 400), to: offset(driverRoute.to, -500, 300), hora: driverRoute.ida_hora, volta: null, dias: driverRoute.dias },
    vagas: driverRoute.vagas, car_label: null,
  }];
}

function view(req) {
  if (req.papel === 'passageiro' && req.status === 'pendente' && req.isExample && Date.now() - new Date(req.created_at).getTime() >= ACCEPT_AFTER_MS) req.status = 'aceita';
  const accepted = req.status === 'aceita';
  return { ...req, telefone: accepted ? (req.papel === 'motorista' ? '18999990001' : '18999990000') : null, placa: accepted && req.papel === 'passageiro' ? 'EXE1M23' : null };
}

const find = (id) => (state.carpool ?? []).find((r) => r.id === id);

export const caronaDemo = {
  async requestCarpool({ driverRouteId, passengerRouteId, mensagem }) {
    needLogin('pedir carona');
    const mine = (state.dailyRoutes ?? []).find((r) => r.id === passengerRouteId && r.papel === 'passageiro');
    if (!mine) throw new Error('Escolha uma das suas rotas.');
    const driver = EXAMPLE_DAILY_RIDES.find((r) => r.id === driverRouteId);
    if (!driver) throw new Error('Esta rota não é de um motorista.');
    if ((state.carpool ?? []).some((r) => r.papel === 'passageiro' && r.driver_route.id === driverRouteId && r.passenger_route.id === passengerRouteId)) throw new Error('Você já pediu carona nesta rota.');
    const req = {
      id: nextId('pedido'), papel: 'passageiro', status: 'pendente', mensagem: (mensagem ?? '').trim() || null, created_at: new Date(Date.now()).toISOString(),
      outro: driver.motorista, isExample: true, driver_route: asRoute(driver), passenger_route: asRoute(mine), vagas: driver.vagas_livres, car_label: 'Carro de exemplo',
    };
    state.carpool = [...(state.carpool ?? []), req];
    save();
    return req.id;
  },
  async listCarpoolRequests() { return [...(state.carpool ?? [])].reverse().map(view); },
  async respondCarpoolRequest(id, aceitar) {
    needLogin('responder');
    const req = find(id);
    if (!req || req.papel !== 'motorista') throw new Error('Pedido não encontrado.');
    if (req.status !== 'pendente') throw new Error('Este pedido já foi respondido.');
    const taken = (state.carpool ?? []).filter((r) => r.papel === 'motorista' && r.driver_route.id === req.driver_route.id && r.status === 'aceita').length;
    if (aceitar && taken >= req.vagas) throw new Error('Não há mais vagas nesta rota.');
    req.status = aceitar ? 'aceita' : 'recusada';
    save();
  },
  async cancelCarpoolRequest(id) {
    needLogin('cancelar');
    const req = find(id);
    if (!req || req.papel !== 'passageiro' || !['pendente', 'aceita'].includes(req.status)) throw new Error('Pedido não encontrado.');
    req.status = 'cancelada';
    save();
  },
  async listRequestMessages(id) { return (state.requestMessages ?? []).filter((m) => m.request_id === id).map(({ request_id: _r, ...m }) => m); },
  async sendRequestMessage(id, body) {
    needLogin('conversar');
    const req = find(id);
    if (!req) throw new Error('Conversa não encontrada.');
    if (['recusada', 'cancelada'].includes(req.status)) throw new Error('Esta conversa foi encerrada (pedido recusado ou cancelado).');
    const text = String(body ?? '').trim();
    if (!text) throw new Error('Escreva uma mensagem.');
    if (text.length > 500) throw new Error('Mensagem longa demais (máximo 500 letras).');
    const thread = (state.requestMessages ?? []).filter((m) => m.request_id === id);
    const now = Date.now();
    const answers = REPLIES[req.papel];
    const reply = answers[Math.min(thread.filter((m) => !m.mine).length, answers.length - 1)];
    state.requestMessages = [...(state.requestMessages ?? []),
      { id: nextId('msg'), request_id: id, mine: true, autor: state.user.apelido, body: text, created_at: new Date(now).toISOString() },
      { id: nextId('msg'), request_id: id, mine: false, autor: req.outro, body: reply, created_at: new Date(now + 1000).toISOString() }];
    save();
  },
};
