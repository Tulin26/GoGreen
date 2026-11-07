import { isDemo } from '../dados/index.js';
import { prefs } from '../shared/preferencias.js';
import { $ } from '../shared/ui/dom.js';
import { icon } from '../shared/ui/icones.js';
import { NAV } from './rotas-do-app.js';

                                                                                    
export function renderShell() {
  document.querySelector('#app').innerHTML = `<div class="app"><div class="app__interno">
  <header class="topo">
    <a class="logo" href="#/rotas" aria-label="GoGreen, início">${icon('folha')}<span>GoGreen</span></a>
    <span class="topo__espaco"></span>
    <span class="etiqueta-demo rs-badge-muted" data-demo hidden></span>
    <a class="botao botao--icone rs-btn-subtle rs-btn-icon" href="#/perfil" aria-label="Seu perfil e seus carros">${icon('pessoa')}</a>
    <button class="botao botao--icone rs-btn-subtle rs-btn-icon" type="button" data-tema aria-label="Alternar tema claro e escuro"></button>
  </header>
  <main class="app__corpo" data-corpo></main>
  <nav class="nav rs-bottom-navigation" aria-label="Principal"><ul class="nav__lista rs-bottom-navigation-list">${NAV.map(([k, label, ic]) => `<li><a class="nav__item rs-bottom-navigation-link" href="#/${k}" data-nav="${k}">${icon(ic)}<span>${label}</span></a></li>`).join('')}</ul></nav>
</div></div>`;
}

export function paintChrome() {
  const demo = $('[data-demo]');
  const showDemo = isDemo;
  demo.hidden = !showDemo;
  demo.textContent = showDemo ? 'Demo' : '';
  demo.setAttribute('aria-label', showDemo ? 'Modo de demonstração: os dados são fictícios' : '');
  demo.title = showDemo ? 'Modo de demonstração: os dados são fictícios' : '';
}

function applyTheme(theme) {
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  const dark = (theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  $('[data-tema]').innerHTML = icon(dark ? 'sol' : 'lua');
  window.dispatchEvent(new CustomEvent('gogreen:themechange', { detail: { theme: theme ?? null } }));
}

export function bindShell() {
  applyTheme(prefs.get('theme', null));
  $('[data-tema]').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    prefs.set('theme', next);
    applyTheme(next);
  };
}
