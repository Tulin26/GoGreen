import { store } from '../../dados/index.js';
import { getRoutes } from '../../servicos/caminhos.js';
import { getFuelPrices } from '../../servicos/combustiveis.js';
import { onChange, session } from '../../shared/estado.js';
import { googleErrorText } from '../../shared/mapa/google.js';
import { prefs } from '../../shared/preferencias.js';
import { $, estado } from '../../shared/ui/dom.js';
import { createBusca } from './busca.js';
import { createExtrasPanel } from './extras-panel.js';
import { createRotina } from './rotina.js';
import { howWeCalculate } from './como-calculamos.js';
import { createRouteMap } from './mapa-lateral.js';
import { buildOptions } from './opcoes.js';
import { readRoutePrefs } from './preferencias.js';
import { bestMetrics, rankOptions } from './recomendacao.js';
import { CARREGANDO, resultadoHtml, telaHtml } from './templates.js';

export function renderRotas(root) {
  root.innerHTML = telaHtml();

  const result = $('[data-resultado]', root);
  const busca = createBusca(root, { onCompare: compare, onLocate: (fix) => mapa?.setUser(fix.point, fix.accuracy) });
  const layout = $('.tela--dividida', root);
  const panel = $('[data-painel]', root);
  // Depois de buscar, o painel mostra só o resultado, com "Voltar" no topo; Voltar reabre o formulário.
  const setMode = (mode) => { panel.dataset.modo = mode; if (mode === 'resultado') { panel.dataset.busca = 'feita'; panel.scrollTop = 0; } };
  setMode('form');
  let mapa;
  function setMobileView(view) {
    layout.dataset.mobileView = view;
    root.querySelectorAll('[data-visao-rota]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.visaoRota === view));
    });
    if (view === 'mapa') mapa?.ensure();
  }
  mapa = createRouteMap($('[data-mapa]', root), { onMobileMap: () => setMobileView('mapa') });
  const rotina = createRotina(root);
  const extras = createExtrasPanel({ root, result, mapa, rotina, busca, getBase: (mode) => current?.options.find((o) => o.mode === mode) });
  root.querySelectorAll('[data-visao-rota]').forEach((button) => {
    button.addEventListener('click', () => setMobileView(button.dataset.visaoRota));
  });
  let abort = null;
  let alive = true;
  let current = null;

  const paintPrefs = (p) => root.querySelectorAll('[data-pref]').forEach((el) => { el.checked = p[el.dataset.pref]; });
  paintPrefs(readRoutePrefs());
  root.querySelectorAll('[data-pref]').forEach((el) => {
    el.addEventListener('change', () => {
      prefs.set(el.dataset.pref, el.checked);
      if (current) compute(current.routes);
    });
  });

  const offUser = onChange((what) => {
    if (what !== 'user') return;
    paintPrefs(readRoutePrefs());
    if (current) compute(current.routes);
  });

  async function compute(routes, { scroll = false } = {}) {
    const [prices, cars] = await Promise.all([getFuelPrices(), session.user ? store.listCars().catch(() => []) : []]);
    if (!alive) return;
    const p = readRoutePrefs({ hasCars: cars.some((car) => car.tipo !== 'moto'), hasMotos: cars.some((car) => car.tipo === 'moto') });
    paintPrefs(p);
    const options = buildOptions(routes, p, { prices: prices.precos, cars });
    current = { routes, options };
    session.lastCompare = { routes };
    const ranked = rankOptions(options, p);
    const ctx = { ...ranked, prefs: p, best: bestMetrics(options) };
    const [from, to] = busca.labels();
    $('[data-titulo]', root).hidden = true;
    setMode('resultado');
    result.innerHTML = resultadoHtml({ from, to, options, ranked, ctx, prices });
    if (scroll) {
      const head = $('.resultado-cabeca h2', result);
      head.tabIndex = -1;
      head.classList.add('foco-titulo');
      head.focus({ preventScroll: true });
      head.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    await mapa.draw(ranked.best);
    extras.show({ routes, prefs: p, cars, prices: prices.precos });
  }

  async function compare() {
    setMobileView('lista');
    busca.clearError();
    if (!busca.isFilled()) return;
    abort?.abort();
    abort = new AbortController();
    const { signal } = abort;
    busca.clearSuggestions();
    setMode('resultado');
    result.innerHTML = CARREGANDO;
    try {
      const pending = await busca.resolve(signal);
      if (pending?.noResults) {
        const { key } = pending;
        result.innerHTML = estado({ ic: 'alerta', erro: true, titulo: 'Não encontramos esse lugar em Araçatuba', texto: 'Confira o endereço ou marque o ponto no mapa.', acao: `<button class="btn btn-outline-success botao botao--secundario" type="button" data-editar="${key}">Marcar no mapa</button>` });
        $('[data-editar]', result).onclick = () => busca.usePick(key).then(() => { if (busca.hasPoint(key)) compare(); });
        return;
      }
      if (pending?.choose) {
        result.innerHTML = '';
        setMode('form');
        busca.offerChoice(pending.choose, pending.key);
        return;
      }
      if (!busca.insideCity()) {
        result.innerHTML = estado({ ic: 'alerta', titulo: 'Esse lugar fica fora de Araçatuba', texto: 'Por enquanto, o GoGreen compara rotas só dentro da cidade.' });
        return;
      }
      const [a, b] = busca.points();
      const routes = {
        foot: await getRoutes('foot', a, b, { signal }),
        bike: await getRoutes('bike', a, b, { signal }),
        car: await getRoutes('car', a, b, { signal, alternatives: true }),
      };
      if (!alive) return;
      await compute(routes, { scroll: true });
    } catch (e) {
      if (e.name === 'AbortError') return;
      const offline = e.message === 'sem-rede' || !navigator.onLine;
      result.innerHTML = estado({
        ic: offline ? 'semRede' : 'alerta', erro: !offline,
        titulo: offline ? 'Você está sem internet' : 'A busca de lugares não respondeu',
        texto: offline ? 'Para comparar rotas, conecte-se e tente de novo.' : googleErrorText(e),
        acao: '<button class="btn btn-outline-success botao botao--secundario" type="button" data-de-novo>Tentar de novo</button>',
      });
      $('[data-de-novo]', result).onclick = compare;
    }
  }

  $('[data-comparar]', root).onclick = compare;
  $('[data-voltar]', root).onclick = () => { abort?.abort(); setMode('form'); $('#r-de', root)?.focus(); };

  result.addEventListener('click', (e) => {
    const walk = e.target.closest('[data-caminho]');
    if (walk) {
      const opt = current?.options.find((o) => o.mode === walk.dataset.caminho);
      if (opt) mapa.show(opt);
      return;
    }
    if (e.target.closest('[data-exemplo-rota]')) { busca.fillExample(); compare(); return; }
    if (e.target.closest('[data-como]')) getFuelPrices().then(howWeCalculate);
  });

  if (session.lastCompare && busca.hasBothPoints()) compute(session.lastCompare.routes);
  else mapa.ensure();

  return () => {
    alive = false;
    offUser();
    extras.destroy();
    abort?.abort();
    busca.saveTexts();
    mapa.destroy();
  };
}
