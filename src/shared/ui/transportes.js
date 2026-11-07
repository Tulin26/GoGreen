import { TRANSPORTES } from '../../config/transporte.js';
import { icon } from './icones.js';

                                                                              
export const transportesHtml = (selected = []) => `<fieldset class="campo campo--grupo">
  <legend class="campo__rotulo">Como você se locomove?</legend>
  <div class="opcoes opcoes--grade">${TRANSPORTES.map((t) => `<label class="opcao"><input type="checkbox" data-transporte="${t.key}" ${selected.includes(t.key) ? 'checked' : ''}><span class="opcao__caixa">${icon('check')}</span>${t.label}</label>`).join('')}</div>
  <p class="campo__ajuda">Pode marcar mais de um. A recomendação de rota considera o que você marcar.</p>
</fieldset>`;

export const readTransportes = (root) => [...root.querySelectorAll('[data-transporte]:checked')].map((el) => el.dataset.transporte);
