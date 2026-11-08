import { store } from '../../dados/index.js';
import { getRoutes } from '../../servicos/caminhos.js';
import { getFuelPrices } from '../../servicos/combustiveis.js';
import { detourFor } from '../../servicos/desvio.js';
import { session } from '../../shared/estado.js';
import { esc, fmtAgo, fmtCo2, fmtKm, fmtMin, fmtMoney } from '../../shared/formato.js';
import { openMapDialog } from '../../shared/mapa/dialogos.js';
import { confirmar } from '../../shared/ui/confirmar.js';
import { toast } from '../../shared/ui/toast.js';
import { tripChoices } from '../carros/economia.js';
import { moneyFor } from '../rotas/recomendacao.js';
import { requireLogin } from '../conta/login.js';
import { openChat } from './chat.js';
import { analyze } from '../rotas/desvio.js';
import { formatDays, isClosed, sortRequests, whatsappUrl } from './regras.js';

const STATUS = { pendente: 'Aguardando resposta', aceita: 'Aceita', recusada: 'Recusada', cancelada: 'Cancelada' };
const when = (r) => `${esc(r.hora)} · ${formatDays(r.dias)}`;
const POLL_MS = 20000;
const badge = (r) => `<span class="selo selo--status selo--${esc(r.status)}">${STATUS[r.status]}</span>`;
const age = (r) => (r.created_at ? `<span class="texto-2 texto-peq"> · pedido ${fmtAgo(r.created_at)}</span>` : '');

async function costPerKm() {
  const prices = (await getFuelPrices()).precos;
  const cars = await store.listCars().catch(() => []);
  return tripChoices(cars, 1, prices)[0]?.money ?? moneyFor('car', 1, { gasPrice: prices.gasolina });
}

const contact = (name, phone, plate) => `<p class="texto-peq"><strong>Combine com ${esc(name)}:</strong> <a href="${esc(whatsappUrl(phone))}" target="_blank" rel="noopener">WhatsApp</a>${plate ? `. Placa ${esc(plate)}` : ''}.</p>`;

function receivedCard(r) {
  const p = r.passenger_route;
  return `<li class="trajeto__cartao" data-pedido="${esc(r.id)}">
    <h3>${esc(r.outro)} quer carona ${r.isExample ? '<span class="selo selo--horario">exemplo</span>' : ''} ${badge(r)}</h3>
    <p>Embarca em <strong>${esc(p.origem)}</strong> e desce em <strong>${esc(p.destino)}</strong><br><span class="texto-2">${when(p)}</span>${age(r)}</p>
    ${r.mensagem ? `<p class="texto-2">“${esc(r.mensagem)}”</p>` : ''}
    ${r.status === 'pendente' ? `<div data-analise aria-live="polite"><p class="texto-2" role="status">Calculando o desvio…</p></div>` : ''}
    ${r.status === 'aceita' && r.telefone ? contact(r.outro, r.telefone) : ''}
    <div class="cartao-rota__acoes">
      ${r.status === 'pendente' ? '<button class="btn btn-success botao botao--primario" type="button" data-aceitar>Aceitar</button><button class="btn btn-outline-success botao botao--secundario" type="button" data-recusar>Recusar</button><button class="btn btn-link botao botao--texto" type="button" data-mapa hidden>Ver no mapa</button>' : ''}
      ${isClosed(r) ? '' : '<button class="btn btn-link botao botao--texto" type="button" data-conversar>Conversar</button>'}</div></li>`;
}

const mineCard = (r) => `<li class="trajeto__cartao" data-pedido="${esc(r.id)}">
  <h3>Carona com ${esc(r.outro)} ${r.isExample ? '<span class="selo selo--horario">exemplo</span>' : ''} ${badge(r)}</h3>
  <p>${esc(r.driver_route.origem)} até ${esc(r.driver_route.destino)}<br><span class="texto-2">Sai às ${esc(r.driver_route.hora)}${r.car_label ? ` · ${esc(r.car_label)}` : ''}</span>${age(r)}</p>
  ${r.status === 'aceita' && r.telefone ? contact(r.outro, r.telefone, r.placa) : ''}
  <div class="cartao-rota__acoes">${isClosed(r) ? '' : '<button class="btn btn-link botao botao--texto" type="button" data-conversar>Conversar</button><button class="btn btn-link botao botao--texto" type="button" data-cancelar>Cancelar pedido</button>'}</div></li>`;

function analysisHtml(a) {
  if (!a.calculated) return `<p class="texto-2">Desvio não calculado agora (o mapa do Google não respondeu). Divisão sugerida só do trecho: ${fmtMoney(a.suggestedShare)}. CO₂ evitado: ${fmtCo2(a.co2)}.</p>`;
  return `<dl class="metricas"><div class="metrica"><dt>desvio</dt><dd>+${fmtKm(a.extraKm)} · +${fmtMin(a.extraMin)}</dd></div>
    <div class="metrica"><dt>combustível extra</dt><dd>${fmtMoney(a.extraFuel)}</dd></div>
    <div class="metrica"><dt>divisão sugerida</dt><dd>${fmtMoney(a.suggestedShare)}</dd></div>
    <div class="metrica"><dt>CO₂ evitado</dt><dd>${fmtCo2(a.co2)}</dd></div></dl>
    <p class="texto-2 texto-peq">A divisão é só uma sugestão (metade do combustível do trecho e o desvio inteiro). O GoGreen não cobra nem processa pagamento.</p>`;
}

const section = (titulo, lista, fn) => (lista.length ? `<h2 class="secao-titulo">${titulo}</h2><ul class="lista-cartoes">${lista.map(fn).join('')}</ul>` : '');
const retry = '<button class="btn btn-outline-success botao botao--secundario" type="button" data-tentar>Tentar de novo</button>';

export function createPedidos({ box, onCount = () => {} }) {
  const analyses = new Map();
  const byId = new Map();
  let token = 0;
  let lastSignature = '';

  async function analyzeRequest(r, card) {
    const show = (a) => {
      const slot = card.querySelector('[data-analise]');
      if (slot) slot.innerHTML = analysisHtml(a);
      if (a.detour) card.querySelector('[data-mapa]').hidden = false;
    };
    if (analyses.has(r.id)) { show(analyses.get(r.id)); return; }
    const perKm = await costPerKm();
    const p = r.passenger_route;
    const detour = await detourFor(r.driver_route, p).catch(() => null);
    const direct = (await getRoutes('car', p.from, p.to))[0];
    const a = { ...analyze({ detour, passengerKm: direct.km, perKm }), detour };
    analyses.set(r.id, a);
    show(a);
  }

  /** quiet: atualização automática em segundo plano, que não troca a tela por "carregando" nem mexe nela se nada mudou. */
  async function refresh({ quiet = false } = {}) {
    const mine = ++token;
    if (!session.user) {
      onCount({ pendentes: 0, total: 0 });
      box.innerHTML = '<h2 class="secao-titulo">Pedidos de carona</h2><p class="texto-2">Entre na sua conta para ver os pedidos que você fez e os que recebeu.</p><button class="btn btn-success botao botao--primario" type="button" data-entrar>Entrar ou criar conta</button>';
      return;
    }
    if (!quiet && !box.querySelector('[data-pedido]')) box.innerHTML = '<p role="status" class="texto-2">Carregando seus pedidos…</p>';
    let all;
    try { all = await store.listCarpoolRequests(); } catch {
      if (mine === token && !quiet) box.innerHTML = `<p class="texto-2" role="alert">Não foi possível carregar seus pedidos agora. Confira a conexão.</p>${retry}`;
      return;
    }
    if (mine !== token) return;
    const signature = JSON.stringify(all.map((r) => [r.id, r.status, r.telefone]));
    if (quiet && signature === lastSignature) return;
    lastSignature = signature;
    onCount({ pendentes: all.filter((r) => r.papel === 'motorista' && r.status === 'pendente').length, total: all.length });
    byId.clear();
    all.forEach((r) => byId.set(r.id, r));
    const received = sortRequests(all.filter((r) => r.papel === 'motorista'));
    const asked = sortRequests(all.filter((r) => r.papel === 'passageiro'));
    const closedCount = all.filter(isClosed).length;
    box.innerHTML = all.length
      ? `${section('Solicitações recebidas', received.filter((r) => !isClosed(r)), receivedCard)}
        ${section('Meus pedidos', asked.filter((r) => !isClosed(r)), mineCard)}
        ${closedCount ? `<details class="pedidos__encerrados"><summary>Pedidos encerrados (${closedCount})</summary>
          <ul class="lista-cartoes">${received.filter(isClosed).map(receivedCard).join('')}${asked.filter(isClosed).map(mineCard).join('')}</ul></details>` : ''}`
      : '<h2 class="secao-titulo">Pedidos de carona</h2><p class="texto-2">Nenhum pedido por enquanto. Quando alguém pedir carona na sua rota, ou quando você pedir uma carona em Rotas, ele aparece aqui.</p>';
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

  // Trava os botões do cartão enquanto a ação roda, para um toque duplo não enviar duas vezes.
  async function act(card, fn, ok) {
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try { await fn(); toast(ok); } catch (er) { toast(er.message || 'Não foi possível concluir. Tente de novo.'); }
    await refresh();
  }

  box.addEventListener('click', async (e) => {
    if (e.target.closest('[data-tentar]')) { refresh(); return; }
    if (e.target.closest('[data-entrar]')) { if (await requireLogin('Entre para ver seus pedidos.')) refresh(); return; }
    const card = e.target.closest('[data-pedido]');
    if (!card) return;
    const r = byId.get(card.dataset.pedido);
    if (!r) return;
    if (e.target.closest('[data-aceitar]')) act(card, () => store.respondCarpoolRequest(r.id, true), 'Pedido aceito. O telefone dele já aparece.');
    else if (e.target.closest('[data-recusar]')) {
      if (await confirmar({ titulo: 'Recusar este pedido?', texto: `${r.outro} será avisado e não poderá pedir de novo esta mesma carona.`, confirmar: 'Recusar', perigo: true })) act(card, () => store.respondCarpoolRequest(r.id, false), 'Pedido recusado.');
    } else if (e.target.closest('[data-cancelar]')) {
      if (await confirmar({ titulo: 'Cancelar este pedido?', texto: 'O motorista deixa de ver o seu pedido e a conversa é encerrada. Para pedir de novo, será preciso salvar uma nova rota.', confirmar: 'Cancelar pedido', voltar: 'Manter pedido', perigo: true })) act(card, () => store.cancelCarpoolRequest(r.id), 'Pedido cancelado.');
    } else if (e.target.closest('[data-mapa]')) showMap(r);
    else if (e.target.closest('[data-conversar]')) openChat({ requestId: r.id, title: `Conversa com ${r.outro}` });
  });

  // Quem recebe pedidos não precisa recarregar a página: a lista se atualiza sozinha enquanto a tela está aberta e visível.
  const timer = setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) refresh({ quiet: true }); }, POLL_MS);

  return { refresh, stop: () => clearInterval(timer) };
}
