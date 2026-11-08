import { CITY } from '../../config/cidade.js';
import { authError, googleErrorText, hasGoogleKey } from './google.js';
import { makeGroup } from './grupo.js';
import { createGoogleEngine } from './mapa-google.js';
import { createLeafletEngine } from './mapa-leaflet.js';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const mapErrorHtml = (text) => `<div class="mapa__erro" role="status"><span>${text}</span><button class="btn btn-link botao botao--texto" type="button" data-tentar>Tentar de novo</button></div>`;

function showMapError(container, text, retry) {
  container.querySelector('.mapa__erro')?.remove();
  container.insertAdjacentHTML('beforeend', mapErrorHtml(text));
  const box = container.querySelector('.mapa__erro');
  box.querySelector('[data-tentar]').onclick = () => { box.remove(); retry(); };
}

/**
 * Mapa do app. Usa o Google; se o Google falhar (sem chave, chave recusada, cota, rede) troca sozinho para o OpenStreetMap,
 * sem perder o que já estava desenhado. Quem chama recebe sempre a mesma interface.
 */
export async function createMap(container, { center = CITY.center, zoom = 13 } = {}) {
  let engine = null;
  let dead = false;
  let watcher = null;
  const groups = [];
  const redrawAll = () => groups.forEach((g) => g.redraw());

  async function useLeaflet(at, z) {
    const next = await createLeafletEngine(container, { center: at, zoom: z });
    if (dead) { next.destroy(); return; }
    engine = next;
    redrawAll();
  }

  // O Google pode falhar depois de criado (chave recusada avisa de forma assíncrona): troca mantendo posição e desenhos.
  async function fallBack() {
    if (dead || engine?.name !== 'google') return;
    const at = engine.center();
    groups.forEach((g) => g.detach());
    engine.destroy();
    engine = null;
    container.querySelector('.google-map')?.remove();
    try { await useLeaflet(at, 14); } catch { showMapError(container, 'O mapa não carregou. Confira a internet e tente de novo.', () => createMap(container, { center, zoom })); }
  }
  const onGoogleFail = () => fallBack();
  window.addEventListener('gogreen:google-falhou', onGoogleFail);
  // O Google também pode desenhar a própria caixa de erro sem avisar (cota, cobrança): vigia o aparecimento dela.
  watcher = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => { if (container.querySelector('.gm-err-container')) fallBack(); });
  watcher?.observe(container, { childList: true, subtree: true });

  if (hasGoogleKey() && !authError.failed) {
    try { engine = await createGoogleEngine(container, { center, zoom }, { before: () => groups.forEach((g) => g.detach()), after: redrawAll }); } catch { engine = null; }
  }
  if (!engine) {
    try { await useLeaflet(center, zoom); } catch (e) {
      watcher?.disconnect();
      window.removeEventListener('gogreen:google-falhou', onGoogleFail);
      showMapError(container, googleErrorText(e), () => createMap(container, { center, zoom }));
      return null;
    }
  }

  return {
    group() { const g = makeGroup(() => engine); groups.push(g); return g; },
    fit: (points, padding) => engine?.fit(points, padding),
    setView: (point, zoom2) => engine?.setView(point, zoom2),
    panTo: (point) => engine?.panTo(point),
    center: () => engine?.center() ?? center,
    invalidate: () => engine?.invalidate(),
    destroy() {
      dead = true;
      watcher?.disconnect();
      window.removeEventListener('gogreen:google-falhou', onGoogleFail);
      groups.forEach((g) => g.clear());
      engine?.destroy();
    },
  };
}
