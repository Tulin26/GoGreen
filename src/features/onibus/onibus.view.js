import { BUS } from '../../config/transporte.js';
import { store } from '../../dados/index.js';
import { loadBusStops } from '../../servicos/pontos-onibus.js';
import { loadLinePath } from '../../servicos/linha-estimada.js';
import { onChange, session } from '../../shared/estado.js';
import { pickPointOnMap } from '../../shared/mapa/dialogos.js';
import { createMap } from '../../shared/mapa/mapa.js';
import { getBestPosition } from '../../shared/mapa/posicao.js';
import { prefs } from '../../shared/preferencias.js';
import { $ } from '../../shared/ui/dom.js';
import { toast } from '../../shared/ui/toast.js';
import { requireLogin } from '../conta/login.js';
import { stopsOnRoute } from './estimativa.js';
import { bindLinePicker } from './escolha.js';
import { askConsent, stopReporting } from './informar.js';
import { lineByCode } from '../../config/linhas-onibus.js';
import { drawBuses, drawBusRoute } from './mapa-onibus.js';
import { prediction } from './previsao.js';
import { pickerHtml, sentText, sheetHtml } from './templates.js';

export function renderOnibus(root) {
  let lineCode = prefs.get('line', null);
  let dirIndex = prefs.get('dir', 0);
  let userPoint = null;
  let positions = [];
  let handle = null;
  let busLayer = null;
  let routeLayer = null;
  let estimatePath = null;
  let estimateStops = [];
  let estimateToken = 0;
  let lastDistance = new Map();
  let wasLive = false;
  let shownKind = null;
  let shownTrip = false;
  let lastSpoken = '';
  let lastSpokenAt = 0;
  let alive = true;
  let pollTimer = null;
  let estimateTimer = null;

  const getLine = () => (lineCode ? lineByCode(lineCode) : null);
  const state = () => ({ dirIndex, positions, userPoint, lastDistance, path: estimatePath, stops: estimateStops });
  const draw = (line) => drawBuses(handle, busLayer, line, state(), !estimatePath);
  const drawRoute = (line) => drawBusRoute(routeLayer, line, estimatePath, estimateStops);

  async function loadRoute(line) {
    const token = ++estimateToken;
    try {
      const path = await loadLinePath(line);
      if (!alive || token !== estimateToken || !path) return;
      const stops = await loadBusStops();
      if (!alive || token !== estimateToken) return;
      estimatePath = path;
      estimateStops = stops;
      drawRoute(line);
      const padding = window.matchMedia('(min-width: 1100px)').matches
        ? { top: 44, right: 44, bottom: 44, left: 480 }
        : 40;
      handle?.fit(path.geometry, padding);
      paintSheet();
      draw(line);
    } catch {}
  }

  function paintSheet() {
    const line = getLine();
    const sheet = $('[data-folha]', root);
    if (!line || !sheet) return;
    shownKind = prediction(line, state()).kind;
    shownTrip = Boolean(session.trip);

    const focused = document.activeElement;
    const key = sheet.contains(focused) ? ['data-informar', 'data-gps', 'data-marcar', 'data-trocar', 'data-parar', 'data-sentido'].find((k) => focused.hasAttribute(k)) : null;
    const selector = key ? `[${key}${key === 'data-sentido' ? `="${focused.getAttribute(key)}"` : ''}]` : null;
    sheet.innerHTML = sheetHtml(line, state());
    if (selector) ($(selector, sheet) ?? $('.foco-titulo', sheet))?.focus({ preventScroll: true });
    draw(line);
  }

  async function poll() {
    if (document.hidden || !alive) return;
    try {
      positions = await store.listPositions();
    } catch {
      positions = [];
    }
    const line = getLine();
    if (!line || !alive) return;
    const isLive = positions.some((p) => p.line_code === line.code);
    if (wasLive && !isLive) toast('Perdemos o sinal do ônibus. Voltamos ao horário cadastrado.');
    wasLive = isLive;
    refresh();
  }

  function refresh() {
    const line = getLine();
    if (!line) return;
    const pred = prediction(line, state());
    if (pred.kind !== shownKind) { paintSheet(); return; }
    const box = $('[data-previsao]', root);
    if (box && pred.html && box.innerHTML !== pred.html) box.innerHTML = pred.html;
    announce();
    draw(line);
  }

  function showUserPoint() {
    const label = $('.linha-onibus__ponto', root);
    if (label) label.textContent = 'Você marcou sua posição';
    refresh();
  }

  function announce() {
    const live = $('[data-previsao-sr]', root);
    const value = $('.previsao__valor', root)?.textContent.trim();
    if (!live || !value || value === lastSpoken || Date.now() - lastSpokenAt < 60000) return;
    lastSpoken = value;
    lastSpokenAt = Date.now();
    live.textContent = `Previsão: ${value}`;
  }

  let paintId = 0;
  function paint() {
    const id = ++paintId;
    estimateToken += 1;
    handle?.destroy();
    handle = null;
    clearInterval(pollTimer);
    clearInterval(estimateTimer);
    estimatePath = null;
    estimateStops = [];
    routeLayer = null;
    const line = getLine();
    if (!line) {
      root.innerHTML = `<div class="tela">${pickerHtml()}</div>`;
      bindLinePicker(root);
      $('.foco-titulo', root)?.focus();
      return;
    }
    root.innerHTML = `<div class="tela tela--dividida">
      <section class="folha painel-lateral" aria-label="Previsão e horários do ônibus"><div class="folha__corpo" data-folha></div></section>
      <div class="mapa mapa--onibus" data-mapa role="region" aria-label="Trajeto aproximado da linha, paradas e horários previstos"></div></div>`;
    paintSheet();
    const box = $('[data-mapa]', root);
    createMap(box).then((created) => {
      if (!alive || id !== paintId) { created?.destroy(); return; }
      handle = created;
      routeLayer = handle?.group() ?? null;
      busLayer = handle?.group() ?? null;
      drawRoute(getLine());
      draw(getLine());
      if (estimatePath) {
        const padding = window.matchMedia('(min-width: 1100px)').matches
          ? { top: 44, right: 44, bottom: 44, left: 480 }
          : 40;
        handle?.fit(estimatePath.geometry, padding);
      }
    });
    store.listPositions().then((loaded) => {
      if (!alive || id !== paintId) return;
      positions = loaded;
      refresh();
    }).catch(() => {});
    loadRoute(line);
    pollTimer = setInterval(poll, BUS.pingSeconds * 1000);
    estimateTimer = setInterval(() => { if (!document.hidden && estimatePath) refresh(); }, 10000);
  }

  root.onclick = async (e) => {
    const t = e.target;
    const pick = t.closest('[data-linha]');
    if (pick) { lineCode = pick.dataset.linha; dirIndex = 0; prefs.set('line', lineCode); prefs.set('dir', 0); paint(); return; }
    if (t.closest('[data-trocar]')) { lineCode = null; prefs.set('line', null); paint(); return; }
    const spot = t.closest('[data-ponto-trajeto]');
    if (spot && estimatePath) {
      const s = stopsOnRoute(estimateStops, getLine(), estimatePath)[Number(spot.dataset.pontoTrajeto)];
      if (s) handle?.setView(s.stop.coords, 17);
      return;
    }
    const dir = t.closest('[data-sentido]');
    if (dir) { dirIndex = Number(dir.dataset.sentido); prefs.set('dir', dirIndex); paintSheet(); return; }
    if (t.closest('[data-parar]')) { stopReporting(); return; }
    if (t.closest('[data-gps]')) {
      try { userPoint = (await getBestPosition()).point; lastDistance = new Map(); showUserPoint(); } catch { toast('Não conseguimos sua localização. Ative a localização do navegador ou marque no mapa.', { type: 'erro' }); }
      return;
    }
    if (t.closest('[data-marcar]')) {
      const p = await pickPointOnMap({ title: 'Onde você está?', start: userPoint ?? undefined });
      if (p) { userPoint = p; lastDistance = new Map(); showUserPoint(); }
      return;
    }
    if (t.closest('[data-informar]')) {
      const line = getLine();
      const user = await requireLogin('Entre para informar o ônibus. Sua posição aparece sem nome para os outros.');
      if (user) askConsent(line, line.directions[dirIndex]?.from ?? null);
    }
  };

  const off = onChange((what) => {
    if (what !== 'trip') return;
    if (Boolean(session.trip) !== shownTrip) { paintSheet(); return; }
    const sent = $('[data-enviadas]', root);
    if (sent && session.trip) sent.textContent = sentText(session.trip);
    const offline = $('[data-sem-rede]', root);
    if (offline && session.trip) offline.hidden = !session.trip.offline;
  });
  paint();

  return () => {
    alive = false;
    off();
    clearInterval(pollTimer);
    clearInterval(estimateTimer);
    root.onclick = null;
    handle?.destroy();
  };
}
