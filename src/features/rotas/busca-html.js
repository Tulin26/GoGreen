import { icon } from '../../shared/ui/icones.js';

export const buscaHtml = () => `<form class="busca" novalidate>
  <span class="busca__marca">${icon('origem')}</span>
  <div class="busca__campo"><label class="busca__rotulo rs-field-label" for="r-de">De onde</label><input class="form-control busca__input" id="r-de" placeholder="Rua, bairro ou lugar" autocomplete="off" enterkeyhint="next"></div>
  <button class="busca__trocar" type="button" aria-label="Trocar origem e destino" data-trocar>${icon('trocar')}</button>
  <span class="busca__marca">${icon('destino')}</span>
  <div class="busca__campo busca__campo--destino"><label class="busca__rotulo rs-field-label" for="r-para">Para onde</label><input class="form-control busca__input" id="r-para" placeholder="Rua, bairro ou lugar" autocomplete="off" enterkeyhint="search"></div>
  <span class="busca__linha"></span>
</form>
<button class="botao botao--texto" type="button" data-gps-botao>${icon('minhaLocalizacao')}Usar minha localização como origem</button>
<div data-sugestoes></div>
<p class="campo__erro" role="alert" data-erro hidden></p>`;
