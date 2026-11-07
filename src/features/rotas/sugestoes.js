import { esc } from '../../shared/formato.js';
import { icon } from '../../shared/ui/icones.js';
import { PLACES } from '../../config/lugares.js';

                                                                
export function choiceHtml(items, key, suggest = false) {
  const label = key === 'from' ? 'a origem' : 'o destino';
  return `<p class="texto-peq"><strong>${suggest ? 'Sugestões' : `Qual destes é ${label}?`}</strong></p>
  <ul class="sugestoes">${items.map((it, i) => `<li><button type="button" data-escolha="${i}">${icon('localizacao')}<span><strong>${esc(it.title)}</strong><br><span class="texto-2 texto-peq">${esc(it.subtitle)}</span></span></button></li>`).join('')}</ul>`;
}

                                                
export function startHtml(key) {
  return `<ul class="sugestoes">
  ${key === 'from' ? `<li><button type="button" data-gps>${icon('minhaLocalizacao')}Usar minha localização</button></li>` : ''}
  ${PLACES.map((p, i) => `<li><button type="button" data-lugar="${i}" data-campo-alvo="${key}">${icon('localizacao')}<span>${esc(p.title)}<br><span class="texto-2 texto-peq">${esc(p.subtitle)}</span></span></button></li>`).join('')}
  <li><button type="button" data-no-mapa="${key}">${icon('mapa')}Escolher no mapa</button></li>
</ul>`;
}
