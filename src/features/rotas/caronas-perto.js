import { store } from '../../dados/index.js';
import { esc } from '../../shared/formato.js';
import { $ } from '../../shared/ui/dom.js';
import { toast } from '../../shared/ui/toast.js';
import { requireLogin } from '../conta/login.js';
import { askDialog, cardHtml, findCandidates } from './candidatos.js';

const TITLE = '<h2 class="secao-titulo">Caronas que passam perto</h2>';

                                                                                              
async function passengerRouteId(r) {
  const saved = (await store.listDailyRoutes()).find((x) => x.papel === 'passageiro' && x.origem === r.origem && x.destino === r.destino && x.ida_hora === r.ida_hora);
  if (saved) return saved.id;
  return store.saveDailyRoute({ origem: r.origem, destino: r.destino, from: r.from, to: r.to, ida_hora: r.ida_hora, volta_hora: null, dias: r.dias, oferece_carona: false });
}

   
                                                                                                                            
                                                                                                                      
   
export function createCaronasPerto({ result, mapa }) {
  let list = [];
  let current = null;
  let token = 0;
  const box = () => $('[data-caronas-perto]', result);

  async function show(route) {
    current = route;
    const mine = ++token;
    mapa.setCarpools([]);
    if (!box()) return;
    box().innerHTML = `${TITLE}<p role="status" class="texto-2">Procurando motoristas que passam perto e calculando o desvio de cada um…</p>`;
    let found;
    try { found = await findCandidates(route); } catch { found = []; }
    if (mine !== token || !box()) return;
    list = found;
    box().innerHTML = `${TITLE}${found.length
      ? `<p class="texto-2 texto-peq">${found.length} ${found.length === 1 ? 'motorista passa' : 'motoristas passam'} perto de ${esc(route.origem)} até ${esc(route.destino)}. Toque no cartão de um motorista para ver a rota dele no mapa (em laranja).</p><ul class="lista-cartoes">${found.map((c, i) => cardHtml(c, i, false)).join('')}</ul>`
      : '<p class="texto-2">Nenhum motorista passa perto desta rota agora. Quando alguém cadastrar uma rota parecida, ele aparece aqui.</p>'}`;
  }

                                                                                                           
  function toggleRoute(card) {
    const cards = [...card.parentElement.children];
    const on = !card.classList.contains('cartao-rota--ativa');
    cards.forEach((c) => c.classList.remove('cartao-rota--ativa'));
    if (on) card.classList.add('cartao-rota--ativa');
    mapa.setCarpools(on ? [list[cards.indexOf(card)]] : []);
  }

  result.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-caronas-perto] li.trajeto__cartao');
    if (card && !e.target.closest('button, a')) { toggleRoute(card); return; }
    const b = e.target.closest('[data-caronas-perto] [data-pedir]');
    if (!b || !current) return;
    if (!await requireLogin('Entre para pedir carona.')) return;
    try {
      const id = await passengerRouteId(current);
      if (await askDialog(list[Number(b.dataset.pedir)].driver, { id })) toast('Pedido enviado. Acompanhe na aba Caronas.');
    } catch (er) { toast(er.message || 'Não foi possível pedir a carona agora.'); }
  });

  return { show, clear: () => { token += 1; mapa.setCarpools([]); } };
}
