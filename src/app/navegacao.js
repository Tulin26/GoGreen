import { $, $$ } from '../shared/ui/dom.js';
import { ROUTES } from './rotas-do-app.js';

let cleanup = null;
let navigationId = 0;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, qs] = raw.split('?');
  return { name: ROUTES[name] ? name : 'rotas', query: new URLSearchParams(qs ?? '') };
}

export async function route() {
  const id = ++navigationId;
  const body = $('[data-corpo]');
  const { name, query } = parseHash();
  cleanup?.();
  cleanup = null;
  body.scrollTop = 0;
  body.innerHTML = '';
  const r = ROUTES[name];
  document.title = `${r.title} | GoGreen`;
  $$('[data-nav]').forEach((a) => {
    const current = a.dataset.nav === r.nav;
    if (current) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
    a.classList.toggle('rs-bottom-navigation-current', current);
    a.classList.toggle('rs-tab-active', current);
  });
  const view = await r.view();
  if (id !== navigationId) return;
  cleanup = view(body, { query }) ?? null;

  $('.foco-titulo', body)?.focus({ preventScroll: true });
}
