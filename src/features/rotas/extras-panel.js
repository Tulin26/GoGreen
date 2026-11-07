import { getRoutes } from '../../servicos/caminhos.js';
import { $, $$ } from '../../shared/ui/dom.js';
import { toast } from '../../shared/ui/toast.js';
import { extrasHtml, passosHtml } from './cartoes-extras.js';
import { createGuiaUi } from './guia-ui.js';
import { extraOptions, loadExtraInputs } from './extras.js';
import { createCaronasPerto } from './caronas-perto.js';
import { buildLegs } from './pernas.js';

const route = async (mode, from, to) => (await getRoutes(mode, from, to))[0];

   
                                                                                                                       
                                                                                                                            
                             
   
export function createExtrasPanel({ root, result, mapa, rotina, busca, getBase = () => null }) {
  const guia = createGuiaUi({ root, mapa });
  const perto = createCaronasPerto({ result, mapa });
  let cache = null;                                                                                             
  let extras = [];
  let trip = null;
  let abort = null;

                                                                                                     
  async function show(ctx) {
    const [from, to] = busca.points();
    trip = rotina.trip(from, to);
    const box = () => $('[data-extras]', result);
    if (!trip || !box()) return;
    abort?.abort();
    abort = new AbortController();
    const [fromLabel, toLabel] = busca.labels();
    perto.show({ from: trip.from, to: trip.to, dias: trip.dias, ida_hora: trip.hora, origem: fromLabel, destino: toLabel });
    try {
      if (cache?.routes !== ctx.routes || cache.dias !== trip.dias.join()) {
        cache = { routes: ctx.routes, dias: trip.dias.join(), input: await loadExtraInputs(trip, { signal: abort.signal }) };
      }
      extras = extraOptions({ ...ctx, input: cache.input, trip });
      if (box()) box().innerHTML = extrasHtml(extras);
    } catch (e) {
      if (e.name !== 'AbortError' && box()) box().innerHTML = '<p class="texto-2 texto-peq">Não foi possível buscar mais opções agora.</p>';
    }
  }

  async function select(i) {
    const opt = extras[i];
    const slot = $(`[data-passos="${i}"]`, result);
    if (!opt || !slot) return;
    slot.innerHTML = '<p role="status" class="texto-2">Montando a rota…</p>';
    try {
      const { legs, markers, steps } = await buildLegs(opt, trip, route);
      slot.innerHTML = passosHtml(steps);
      const onMap = $('[data-passos-mapa]', root);
      onMap.innerHTML = `<strong>Passo a passo</strong>${passosHtml(steps)}`;
      onMap.hidden = false;
      await mapa.show({ mode: opt.mode, geometry: legs.flatMap((l) => l.geometry), legs, markers });
    } catch {
      slot.innerHTML = '<p class="campo__erro" role="status">Não foi possível montar a rota agora. Tente de novo.</p>';
    }
  }

                                                                                                     
  async function iniciar(opt) {
    if (!opt || !trip) return;
    try {
      const { legs, markers } = await buildLegs(opt, trip, route);
      await mapa.show({ mode: opt.mode, geometry: legs.flatMap((l) => l.geometry), legs, markers });
      guia.start(legs);
    } catch {
      toast('Não foi possível montar a rota para guiar agora. Tente de novo.');
    }
  }

  root.addEventListener('click', async (e) => {
                                                                                             
    const card = e.target.closest('.cartao-rota');
    if (card) {
      $$('.cartao-rota--ativa', result).forEach((c) => c.classList.remove('cartao-rota--ativa'));
      card.classList.add('cartao-rota--ativa');
      if (!e.target.closest('a, button, summary, input, select, textarea, [data-passos]')) { card.querySelector('[data-extra], [data-caminho]')?.click(); return; }
    }
    const start = e.target.closest('[data-iniciar]');
    if (start) { iniciar(extras[Number(start.dataset.iniciar)]); return; }
    const startBase = e.target.closest('[data-iniciar-base]');
    if (startBase) { iniciar(getBase(startBase.dataset.iniciarBase)); return; }
    const pick = e.target.closest('[data-extra]');
    if (pick) { select(Number(pick.dataset.extra)); return; }
  });

  return { show, destroy: () => { abort?.abort(); guia.destroy(); } };
}
