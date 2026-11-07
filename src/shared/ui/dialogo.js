import { icon } from './icones.js';

                                                              
export function openDialog({ html, className = '', onClose }) {
  const d = document.createElement('dialog');
  d.className = `dialogo ${className}`;
  d.innerHTML = html;
  document.body.append(d);
  d.addEventListener('close', () => { onClose?.(); d.remove(); });
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-fechar]')) d.close(); });
  d.showModal();
  return d;
}

export const closeButton = `<button class="btn btn-link botao botao--icone" type="button" data-fechar aria-label="Fechar">${icon('fechar')}</button>`;
