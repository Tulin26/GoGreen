import { esc } from '../../shared/formato.js';
import { icon } from '../../shared/ui/icones.js';
import { PLACES } from '../../config/lugares.js';

export function choiceHtml(items, key, suggest = false) {
  const label = key === 'from' ? 'a origem' : 'o destino';
  return `<p class="texto-peq"><strong>${suggest ? 'Sugestões' : `Qual destes é ${label}?`}</strong></p>
  <ul class="sugestoes">${items.map((it, i) => `<li><button type="button" data-escolha="${i}">${icon('localizacao')}<span><strong>${esc(it.title)}</strong><br><span class="texto-2 texto-peq">${esc(it.subtitle)}</span></span></button></li>`).join('')}</ul>`;
}

const recentesHtml = (recentes, key) => (recentes.length
  ? `<li class="sugestoes__titulo"><strong>Pesquisados recentemente</strong><button type="button" class="btn btn-link botao botao--texto" data-limpar-historico>Limpar</button></li>
  ${recentes.map((r, i) => `<li><button type="button" data-recente="${i}" data-campo-alvo="${key}">${icon('relogio')}<span>${esc(r.title)}<br><span class="texto-2 texto-peq">${esc(r.subtitle)}</span></span></button></li>`).join('')}`
  : '');

export function startHtml(key, recentes = []) {
  return `<ul class="sugestoes">
  ${key === 'from' ? `<li><button type="button" data-gps>${icon('minhaLocalizacao')}Usar minha localização</button></li>` : ''}
  ${recentesHtml(recentes, key)}
  ${PLACES.map((p, i) => `<li><button type="button" data-lugar="${i}" data-campo-alvo="${key}">${icon('localizacao')}<span>${esc(p.title)}<br><span class="texto-2 texto-peq">${esc(p.subtitle)}</span></span></button></li>`).join('')}
  <li><button type="button" data-no-mapa="${key}">${icon('mapa')}Escolher no mapa</button></li>
</ul>`;
}
