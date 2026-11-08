import { $, $$ } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { nowHHMM } from './extras.js';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const rotinaHtml = () => `
  <div class="trajeto__quando">
    <label class="rs-field-label" for="r-hora">Saio às</label><input class="form-control" id="r-hora" type="time">
    <label class="rs-field-label" for="r-volta">Volto às (opcional)</label><input class="form-control" id="r-volta" type="time">
  </div>
  <details class="preferencias">
    <summary class="preferencias__summary"><strong>Dias da semana</strong><span>Para somar o CO₂ evitado</span></summary>
    <fieldset class="trajeto__dias"><legend class="rs-field-label">Quais dias você faz esse trajeto?</legend>
      ${DIAS.map((d, i) => `<label class="opcao"><input type="checkbox" data-dia="${i}"${i >= 1 && i <= 5 ? ' checked' : ''}><span class="opcao__caixa">${icon('check')}</span>${d}</label>`).join('')}
    </fieldset>
  </details>
  <p class="campo__erro" role="alert" data-erro-rotina hidden></p>`;

export function createRotina(root) {
  const err = $('[data-erro-rotina]', root);
  $('#r-hora', root).value = nowHHMM();
  return {

    trip(from, to) {
      err.hidden = true;
      const dias = $$('[data-dia]', root).filter((c) => c.checked).map((c) => Number(c.dataset.dia));
      if (!dias.length) { err.textContent = 'Marque pelo menos um dia da semana.'; err.hidden = false; return null; }
      const volta = $('#r-volta', root).value;
      return { from, to, hora: $('#r-hora', root).value || nowHHMM(), dias, tripsPerDay: volta ? 2 : 1, volta };
    },
  };
}
