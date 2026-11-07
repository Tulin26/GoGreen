import { esc } from '../formato.js';
import { icon } from './icones.js';
import { $ } from './dom.js';

export function toast(message, { type = 'ok', ms = 6000 } = {}) {
  let box = $('.toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    document.body.append(box);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'erro' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'erro' ? 'alerta' : 'check')}<span>${esc(message)}</span><button class="btn btn-link botao botao--icone" type="button" aria-label="Fechar aviso">${icon('fechar')}</button>`;
  $('button', el).onclick = () => el.remove();
  box.append(el);
  setTimeout(() => el.remove(), ms);
}
