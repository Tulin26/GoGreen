import { store } from '../../dados/index.js';
import { getRoutes } from '../../servicos/caminhos.js';
import { detourFor } from '../../servicos/desvio.js';
import { esc, fmtKm, fmtMin } from '../../shared/formato.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { $ } from '../../shared/ui/dom.js';
import { toast } from '../../shared/ui/toast.js';
import { toMinutes } from './casar-carona.js';
import { MAX_DETOUR_KM, MAX_OPPOSITE_DETOUR_KM, PREFILTER_M, prefilter } from './desvio.js';

const MAX_TIME_GAP_MIN = 30;
const MAX_CHECKED = 15;
const MAX_SHOWN = 5;

export async function findCandidates(route) {
  const noHorario = (await store.matchDailyRides({ dias: route.dias }))
    .filter((d) => Math.abs(toMinutes(d.hora) - toMinutes(route.ida_hora)) <= MAX_TIME_GAP_MIN);
  // Triagem barata antes de pedir rotas: pela reta de cada motorista, com folga para a curva das ruas. Só os melhores têm a rota calculada.
  const drivers = noHorario
    .map((d) => ({ d, pf: prefilter([d.from, d.to], route, PREFILTER_M * 2) }))
    .filter(({ pf }) => pf.ok)
    .sort((x, y) => Number(y.pf.sameDirection) - Number(x.pf.sameDirection) || x.pf.extraKm - y.pf.extraKm)
    .slice(0, MAX_CHECKED)
    .map(({ d }) => d);
  const scored = [];
  for (const d of drivers) {
    const [base] = await getRoutes('car', d.from, d.to);
    const pf = prefilter(base.geometry, route);
    if (pf.ok) scored.push({ driver: d, estimated: Boolean(base.estimated), sameDirection: pf.sameDirection, estExtraKm: pf.extraKm, geometry: base.geometry });
  }
  scored.sort((a, b) => Number(b.sameDirection) - Number(a.sameDirection) || a.estExtraKm - b.estExtraKm);

  const out = [];
  for (const [i, c] of scored.entries()) {
    const detour = i < MAX_SHOWN ? await detourFor({ from: c.driver.from, to: c.driver.to }, route) : null;
    // O desvio calculado pelas ruas manda: acima do limite, a carona dá trabalho demais para o motorista.
    if (detour && detour.extraKm > (c.sameDirection ? MAX_DETOUR_KM : MAX_OPPOSITE_DETOUR_KM)) continue;
    out.push({ ...c, detour });
  }
  return out;
}

export const cardHtml = ({ driver: d, detour, sameDirection, estExtraKm }, i, asked, oculto = false) => `<li class="trajeto__cartao carona"${oculto ? ' hidden data-extra-carona' : ''}>
  <div class="carona__topo"><h3 class="carona__nome">${esc(d.motorista)}${d.isExample ? ' <span class="selo selo--horario">exemplo</span>' : ''}</h3><span class="carona__hora" aria-label="Sai às ${esc(d.hora)}">${esc(d.hora)}</span></div>
  <p class="carona__trajeto">${esc(d.origem)} <span class="carona__seta" aria-hidden="true">→</span> ${esc(d.destino)}</p>
  <p class="carona__meta">${esc(d.veiculo ?? 'Veículo informado pelo motorista')} · ${d.vagas_livres} ${d.vagas_livres === 1 ? 'vaga livre' : 'vagas livres'}</p>
  <p class="carona__desvio"><strong>${detour ? `Desvia ${fmtKm(detour.extraKm)} (+${fmtMin(detour.extraMin)})` : `Desvio aproximado de ${fmtKm(estExtraKm)}`}</strong> <span class="texto-2">· ${sameDirection ? 'mesmo sentido' : 'sentido contrário, desvio pequeno'}</span></p>
  <button class="btn btn-success botao botao--primario" type="button" data-pedir="${i}"${asked ? ' disabled' : ''}>${asked ? 'Pedido enviado' : 'Pedir carona'}</button></li>`;

export function askDialog(driver, route) {
  return new Promise((resolve) => {
    let done = false;
    const d = openDialog({
      html: `<form class="dialogo__corpo" novalidate><div class="dialogo__cabeca"><h2 class="dialogo__titulo">Pedir carona a ${esc(driver.motorista)}</h2>${closeButton}</div>
        <p class="texto-2">Ele vai ver onde você embarca e desembarca e quanto teria de desviar. Telefone e placa só aparecem se ele aceitar.</p>
        <div class="campo"><label class="campo__rotulo" for="p-msg">Mensagem <span class="campo__opcional">(opcional)</span></label><input class="form-control entrada" id="p-msg" maxlength="200" placeholder="Ex.: posso embarcar na esquina da praça"></div>
        <p class="campo__erro" role="alert" hidden></p>
        <button class="btn btn-success botao botao--primario botao--bloco" type="submit">Enviar pedido</button></form>`,
      onClose: () => { if (!done) resolve(false); },
    });
    $('form', d).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await store.requestCarpool({ driverRouteId: driver.id, passengerRouteId: route.id, mensagem: $('#p-msg', d).value });
        done = true;
        resolve(true);
        d.close();
      } catch (er) { const p = $('.campo__erro', d); p.textContent = er.message || 'Não foi possível enviar o pedido.'; p.hidden = false; }
    });
  });
}

export function createCandidatos({ box, onRequested }) {
  let list = [];
  let current = null;
  let token = 0;

  async function show(route) {
    current = route;
    const mine = ++token;
    box.innerHTML = `<h2 class="secao-titulo">Motoristas na minha rota</h2><p role="status" class="texto-2">Procurando motoristas e calculando o desvio de cada um…</p>`;
    let found;
    try { found = await findCandidates(route); } catch { found = []; }
    if (mine !== token) return;
    list = found;
    const asked = new Set((await store.listCarpoolRequests().catch(() => [])).filter((r) => r.papel === 'passageiro' && r.passenger_route.id === route.id && !['cancelada', 'recusada'].includes(r.status)).map((r) => r.driver_route.id));
    if (mine !== token) return;
    box.innerHTML = `<h2 class="secao-titulo">Motoristas na minha rota</h2><p class="texto-2 texto-peq">${esc(route.origem)} até ${esc(route.destino)}, saída às ${esc(route.ida_hora)}.</p>${found.length
      ? `<ul class="lista-cartoes">${found.map((c, i) => cardHtml(c, i, asked.has(c.driver.id))).join('')}</ul>`
      : '<p class="texto-2">Ainda não há motorista com rota parecida. Quando alguém cadastrar uma rota que passe perto, ele aparece aqui.</p>'}`;
  }

  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pedir]');
    if (!b || !current) return;
    if (await askDialog(list[Number(b.dataset.pedir)].driver, current)) { toast('Pedido enviado. Acompanhe em "Meus pedidos".'); await show(current); onRequested(); }
  });
  return { show };
}
