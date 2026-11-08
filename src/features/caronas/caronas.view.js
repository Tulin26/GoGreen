import { onChange } from '../../shared/estado.js';
import { $, $$ } from '../../shared/ui/dom.js';
import { createCandidatos } from '../rotas/candidatos.js';
import { createPedidos } from './solicitacoes.js';
import { createRotaDiaria } from './rota-diaria.js';

const ABAS = [['pedidos', 'Pedidos'], ['rotas', 'Minhas rotas'], ['nova', 'Nova rota']];

const abaHtml = ([id, nome], i) => `<button class="abas__aba" type="button" role="tab" id="aba-${id}" aria-controls="painel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-aba="${id}">${nome}<span class="abas__contagem" data-contagem="${id}" hidden></span></button>`;

export function renderCaronas(root) {
  root.innerHTML = `<div class="tela caronas"><div class="tela__conteudo tela__conteudo--estreito">
    <header class="caronas__topo">
      <h1 class="tela__titulo foco-titulo" tabindex="-1">Caronas</h1>
      <p class="texto-2">Combine carona com quem faz o mesmo caminho que você: peça, ofereça e acompanhe tudo aqui.</p>
    </header>
    <div class="abas" role="tablist" aria-label="Seções de caronas">${ABAS.map(abaHtml).join('')}</div>
    <section class="caronas__painel" id="painel-pedidos" role="tabpanel" aria-labelledby="aba-pedidos" data-painel="pedidos"><div data-pedidos></div></section>
    <section class="caronas__painel" id="painel-rotas" role="tabpanel" aria-labelledby="aba-rotas" data-painel="rotas" hidden>
      <div data-minhas></div><div data-candidatos aria-label="Motoristas na minha rota"></div></section>
    <section class="caronas__painel" id="painel-nova" role="tabpanel" aria-labelledby="aba-nova" data-painel="nova" hidden><div data-rota></div></section>
  </div></div>`;

  const counts = {};
  let picked = false;
  let settled = false;

  function show(id, { byUser = false } = {}) {
    if (byUser) picked = true;
    $$('[data-aba]', root).forEach((b) => {
      const on = b.dataset.aba === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$('[data-painel]', root).forEach((p) => { p.hidden = p.dataset.painel !== id; });
  }

  function setCount(id, n) {
    counts[id] = n;
    const badge = $(`[data-contagem="${id}"]`, root);
    badge.hidden = !n;
    badge.textContent = n || '';
    // Primeira vez que a tela abre: vai direto para onde há algo para ver.
    if (!picked && !settled && counts.pedidos !== undefined && counts.rotas !== undefined) {
      settled = true;
      show(counts.total ? 'pedidos' : counts.rotas ? 'rotas' : 'nova');
    }
  }

  const pedidos = createPedidos({ box: $('[data-pedidos]', root), onCount: ({ pendentes, total }) => { counts.total = total; setCount('pedidos', pendentes); } });
  const candidatos = createCandidatos({ box: $('[data-candidatos]', root), onRequested: () => pedidos.refresh() });
  createRotaDiaria({
    box: $('[data-rota]', root),
    listBox: $('[data-minhas]', root),
    onRoutes: (routes) => { setCount('rotas', routes.length); pedidos.refresh(); },
    onPickRoute: (route) => {
      if (!route) return;
      show('rotas', { byUser: true });
      candidatos.show(route);
      $('[data-candidatos]', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    onSaved: () => show('rotas', { byUser: true }),
    onNew: () => show('nova', { byUser: true }),
  });

  const tabs = $('.abas', root);
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b) show(b.dataset.aba, { byUser: true }); });
  tabs.addEventListener('keydown', (e) => {
    const all = $$('[data-aba]', root);
    const at = all.findIndex((b) => b === document.activeElement);
    if (at < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
    show(all[next].dataset.aba, { byUser: true });
    all[next].focus();
  });

  pedidos.refresh();
  // Entrou ou saiu da conta: a lista de pedidos acompanha.
  const unsubscribe = onChange((what) => { if (what === 'user') pedidos.refresh(); });
  return () => { pedidos.stop(); unsubscribe(); };
}
