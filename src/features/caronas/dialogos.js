import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { $ } from '../../shared/ui/dom.js';
import { AVISO } from './templates.js';

export function acceptTerms() {
  return new Promise((resolve) => {
    let ok = false;
    const d = openDialog({
      html: `<div class="dialogo__corpo"><div class="dialogo__cabeca"><h2 class="dialogo__titulo">Antes de continuar</h2>${closeButton}</div>${AVISO}
        <div class="dialogo__acoes"><button class="btn btn-outline-success botao botao--secundario" type="button" data-fechar>Agora não</button><button class="btn btn-success botao botao--primario" type="button" data-ok>Entendi e tenho 18 anos ou mais</button></div></div>`,
      onClose: () => resolve(ok),
    });
    $('[data-ok]', d).onclick = () => { ok = true; d.close(); };
  });
}
