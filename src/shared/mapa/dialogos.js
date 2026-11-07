import { CITY } from '../../config/cidade.js';
import { closeButton, openDialog } from '../ui/dialogo.js';
import { $ } from '../ui/dom.js';
import { icon } from '../ui/icones.js';
import { inBounds } from './geometria.js';
import { createMap } from './mapa.js';

                                                                     
export function pickPointOnMap({ title = 'Escolha o ponto no mapa', start = CITY.center } = {}) {
  return new Promise((resolve) => {
    let result = null;
    let handle = null;
    const d = openDialog({
      className: 'dialogo--mapa',
      html: `<div class="dialogo__cabeca"><h2 class="dialogo__titulo">${title}</h2>${closeButton}</div>
        <div class="mapa" data-mapa><span class="mapa-mira"><span class="pino pino--ponto">${icon('localizacao')}</span></span></div>
        <div class="dialogo__rodape"><p class="campo__erro" role="alert" hidden></p><p class="texto-2 texto-peq">Arraste o mapa até o local ficar embaixo do pino.</p>
        <button class="btn btn-success botao botao--primario botao--bloco" type="button" data-usar>Usar este ponto</button></div>`,
      onClose: () => { handle?.destroy(); resolve(result); },
    });
    const box = $('[data-mapa]', d);
    createMap(box, { center: start, zoom: 15 }).then((h) => { handle = h; });
    $('[data-usar]', d).onclick = () => {
      if (!handle) return;
      const p = handle.center();
      if (!inBounds(p, CITY.bounds)) {
        const e = $('.campo__erro', d);
        e.textContent = 'Esse ponto fica fora da área de Araçatuba.';
        e.hidden = false;
        return;
      }
      result = p;
      d.close();
    };
  });
}

                                                                         
export function openMapDialog({ title, draw }) {
  let handle = null;
  const d = openDialog({
    className: 'dialogo--mapa',
    html: `<div class="dialogo__cabeca"><h2 class="dialogo__titulo">${title}</h2>${closeButton}</div><div class="mapa" data-mapa></div>`,
    onClose: () => handle?.destroy(),
  });
  const box = $('[data-mapa]', d);
  createMap(box).then((h) => { handle = h; if (h) draw(h); });
}
