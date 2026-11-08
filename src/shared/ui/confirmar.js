import { esc } from '../formato.js';
import { closeButton, openDialog } from './dialogo.js';

/** Pergunta antes de uma ação que não dá para desfazer. Devolve true só se a pessoa confirmar. */
export function confirmar({ titulo, texto, confirmar: rotuloOk = 'Confirmar', voltar = 'Voltar', perigo = false }) {
  return new Promise((resolve) => {
    let ok = false;
    const d = openDialog({
      className: 'dialogo--confirmacao',
      html: `<div class="dialogo__corpo"><div class="dialogo__cabeca"><h2 class="dialogo__titulo">${esc(titulo)}</h2>${closeButton}</div>
        <p>${esc(texto)}</p>
        <div class="dialogo__acoes"><button class="btn btn-outline-success botao botao--secundario" type="button" data-fechar>${esc(voltar)}</button>
        <button class="btn ${perigo ? 'btn-danger' : 'btn-success'} botao botao--primario" type="button" data-ok>${esc(rotuloOk)}</button></div></div>`,
      onClose: () => resolve(ok),
    });
    d.querySelector('[data-ok]').onclick = () => { ok = true; d.close(); };
  });
}
