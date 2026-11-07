import { store } from '../../dados/index.js';
import { getRoutes } from '../../servicos/caminhos.js';
import { getFuelPrices } from '../../servicos/combustiveis.js';
import { detourFor } from '../../servicos/desvio.js';
import { esc, fmtCo2, fmtKm, fmtMin, fmtMoney } from '../../shared/formato.js';
import { openMapDialog } from '../../shared/mapa/dialogos.js';
import { toast } from '../../shared/ui/toast.js';
import { tripChoices } from '../carros/economia.js';
import { moneyFor } from '../rotas/recomendacao.js';
import { openChat } from './chat.js';
import { analyze } from '../rotas/desvio.js';
import { whatsappUrl } from './regras.js';

const STATUS = { pendente: 'Aguardando resposta', aceita: 'Aceita', recusada: 'Recusada', cancelada: 'Cancelada' };
const closed = (r) => r.status === 'recusada' || r.status === 'cancelada';
const when = (r) => `${esc(r.hora)} · ${r.dias.length === 5 && !r.dias.includes(0) && !r.dias.includes(6) ? 'seg a sex' : `${r.dias.length} dias`}`;

                                                                                                                          
async function costPerKm() {
  const prices = (await getFuelPrices()).precos;
  const cars = await store.listCars().catch(() => []);
  return tripChoices(cars, 1, prices)[0]?.money ?? moneyFor('car', 1, { gasPrice: prices.gasolina });
}

const contact = (name, phone, plate) => `<p class="texto-peq"><strong>Combine com ${esc(name)}:</strong> <a href="${esc(whatsappUrl(phone))}" target="_blank" rel="noopener">WhatsApp</a>${plate ? `. Placa ${esc(plate)}` : ''}.</p>`;

function receivedCard(r) {
  const p = r.passenger_route;
  return `<li class="trajeto__cartao" data-pedido="${esc(r.id)}">
    <h3>${esc(r.outro)} quer carona ${r.isExample ? '<span class="selo selo--horario">exemplo</span>' : ''} <span class="selo selo--horario">${STATUS[r.status]}</span></h3>
    <p>Embarca em <strong>${esc(p.origem)}</strong> e desce em <strong>${esc(p.destino)}</strong><br><span class="texto-2">${when(p)}</span></p>
    ${r.mensagem ? `<p class="texto-2">“${esc(r.mensagem)}”</p>` : ''}
    ${r.status === 'pendente' ? `<div data-analise aria-live="polite"><p class="texto-2" role="status">Calculando o desvio…</p></div>` : ''}
    ${r.status === 'aceita' && r.telefone ? contact(r.outro, r.telefone) : ''}
    <div class="cartao-rota__acoes">
      ${r.status === 'pendente' ? '<button class="btn btn-success botao botao--primario" type="button" data-aceitar>Aceitar</button><button class="btn btn-outline-success botao botao--secundario" type="button" data-recusar>Recusar</button><button class="btn btn-link botao botao--texto" type="button" data-mapa hidden>Ver no mapa</button>' : ''}
      ${closed(r) ? '' : '<button class="btn btn-link botao botao--texto" type="button" data-conversar>Conversar</button>'}</div></li>`;
}

const mineCard = (r) => `<li class="trajeto__cartao" data-pedido="${esc(r.id)}">
  <h3>Carona com ${esc(r.outro)} ${r.isExample ? '<span class="selo selo--horario">exemplo</span>' : ''} <span class="selo selo--horario">${STATUS[r.status]}</span></h3>
  <p>${esc(r.driver_route.origem)} até ${esc(r.driver_route.destino)}<br><span class="texto-2">Sai às ${esc(r.driver_route.hora)}${r.car_label ? ` · ${esc(r.car_label)}` : ''}</span></p>
  ${r.status === 'aceita' && r.telefone ? contact(r.outro, r.telefone, r.placa) : ''}
  <div class="cartao-rota__acoes">${closed(r) ? '' : '<button class="btn btn-link botao botao--texto" type="button" data-conversar>Conversar</button><button class="btn btn-link botao botao--texto" type="button" data-cancelar>Cancelar pedido</button>'}</div></li>`;

function analysisHtml(a) {
  if (!a.calculated) return `<p class="texto-2">Desvio não calculado agora (o mapa do Google não respondeu). Divisão sugerida só do trecho: ${fmtMoney(a.suggestedShare)}. CO₂ evitado: ${fmtCo2(a.co2)}.</p>`;
  return `<dl class="metricas"><div class="metrica"><dt>desvio</dt><dd>+${fmtKm(a.extraKm)} · +${fmtMin(a.extraMin)}</dd></div>
    <div class="metrica"><dt>combustível extra</dt><dd>${fmtMoney(a.extraFuel)}</dd></div>
    <div class="metrica"><dt>divisão sugerida</dt><dd>${fmtMoney(a.suggestedShare)}</dd></div>
    <div class="metrica"><dt>CO₂ evitado</dt><dd>${fmtCo2(a.co2)}</dd></div></dl>
    <p class="texto-2 texto-peq">A divisão é só uma sugestão (metade do combustível do trecho e o desvio inteiro). O GoGreen não cobra nem processa pagamento.</p>`;
}

                                                                                                       
export function createPedidos({ box }) {
  const analyses = new Map();
  const byId = new Map();
  let token = 0;

  async function analyzeRequest(r, card) {
    const perKm = await costPerKm();
    const p = r.passenger_route;
    const detour = await detourFor(r.driver_route, p).catch(() => null);
    const direct = (await getRoutes('car', p.from, p.to))[0];
    const a = { ...analyze({ detour, passengerKm: direct.km, perKm }), detour };
    analyses.set(r.id, a);
    const slot = card.querySelector('[data-analise]');
    if (slot) slot.innerHTML = analysisHtml(a);
    if (detour) card.querySelector('[data-mapa]').hidden = false;
  }

  async function refresh() {
    const mine = ++token;
    let all = [];
    try { all = await store.listCarpoolRequests(); } catch { all = []; }
    if (mine !== token) return;
    byId.clear();
    all.forEach((r) => byId.set(r.id, r));
    const received = all.filter((r) => r.papel === 'motorista');
    const asked = all.filter((r) => r.papel === 'passageiro');
    box.innerHTML = `${received.length ? `<h2 class="secao-titulo">Solicitações recebidas</h2><ul class="lista-cartoes">${received.map(receivedCard).join('')}</ul>` : ''}
      ${asked.length ? `<h2 class="secao-titulo">Meus pedidos</h2><ul class="lista-cartoes">${asked.map(mineCard).join('')}</ul>` : ''}`;
    received.filter((r) => r.status === 'pendente').forEach((r) => analyzeRequest(r, box.querySelector(`[data-pedido="${CSS.escape(r.id)}"]`)));
  }

  function showMap(r) {
    const a = analyses.get(r.id);
    if (!a?.detour) return;
    const p = r.passenger_route;
    openMapDialog({
      title: `Rota com ${r.outro}`,
      draw: (h) => {
        const g = h.group();
        g.line(a.detour.base.geometry, { color: '#3C4448', dashed: true });
        g.line(a.detour.withPassenger.geometry, { color: '#0B4A9E' });
        g.pin(p.from, { ic: 'origem', title: 'Embarque' });
        g.pin(p.to, { ic: 'destino', title: 'Desembarque' });
        h.fit([...a.detour.base.geometry, ...a.detour.withPassenger.geometry]);
      },
    });
  }

  box.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-pedido]');
    if (!card) return;
    const r = byId.get(card.dataset.pedido);
    const act = async (fn, ok) => { try { await fn(); toast(ok); } catch (er) { toast(er.message || 'Não foi possível concluir.'); } await refresh(); };
    if (e.target.closest('[data-aceitar]')) act(() => store.respondCarpoolRequest(r.id, true), 'Pedido aceito. O telefone dele já aparece.');
    else if (e.target.closest('[data-recusar]')) act(() => store.respondCarpoolRequest(r.id, false), 'Pedido recusado.');
    else if (e.target.closest('[data-cancelar]')) act(() => store.cancelCarpoolRequest(r.id), 'Pedido cancelado.');
    else if (e.target.closest('[data-mapa]')) showMap(r);
    else if (e.target.closest('[data-conversar]')) openChat({ requestId: r.id, title: `Conversa com ${r.outro}` });
  });

  return { refresh };
}
