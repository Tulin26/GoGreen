import { save, state } from './estado.js';

export const caronasDemo = {
  async listRides() { return [...state.rides].sort((a, b) => new Date(a.saida_em) - new Date(b.saida_em)); },
  async listRideRequests() { return state.requests; },
  async offerRide({ car_id, origem, destino, saida_em, vagas, observacao }) {
    const car = state.cars.find((c) => c.id === car_id);
    const ride = { id: `carona-${Date.now()}`, motorista: state.user.apelido, car_label: `${car.marca} ${car.modelo} ${car.ano}`, origem, destino, saida_em, vagas, vagas_livres: vagas, observacao: observacao || null, minha: true, meu_pedido: null, meu_status: null, telefone: null, placa: null, isExample: false };
    state.rides = [...state.rides, ride];
                                                                                           
    state.requests = [...state.requests, { id: `pedido-${Date.now()}`, ride_id: ride.id, passageiro: 'Passageiro de exemplo', mensagem: 'Pedido de exemplo.', status: 'pendente', telefone: null, demoPhone: '18999990000' }];
    save();
    return ride.id;
  },
  async cancelRide(id) { state.rides = state.rides.filter((r) => r.id !== id); state.requests = state.requests.filter((q) => q.ride_id !== id); save(); },
  async requestRide(id) {
    const r = state.rides.find((x) => x.id === id);
    r.meu_pedido = `meu-${id}`;
    r.meu_status = 'pendente';
    save();
  },
  async cancelRequest(pedido) {
    const r = state.rides.find((x) => x.meu_pedido === pedido);
    if (r) { r.meu_status = 'cancelada'; save(); }
  },
  async respondRequest(id, aceitar) {
    const q = state.requests.find((x) => x.id === id);
    const r = state.rides.find((x) => x.id === q.ride_id);
    if (aceitar && r.vagas_livres <= 0) throw new Error('Não há mais vagas nesta carona.');
    q.status = aceitar ? 'aceita' : 'recusada';
    if (aceitar) { q.telefone = q.demoPhone; r.vagas_livres -= 1; }
    save();
  },
};
