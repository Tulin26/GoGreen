import { icon } from './icones.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const CO2 = 'CO<sub>2</sub>';

export const estado = ({ ic = 'info', titulo, texto, acao = '', erro = false }) => `
  <div class="estado ${erro ? 'estado--erro' : ''}">
    <span class="estado__icone">${icon(ic)}</span>
    <h3 class="estado__titulo">${titulo}</h3>
    ${texto ? `<p class="estado__texto">${texto}</p>` : ''}
    ${acao}
  </div>`;
