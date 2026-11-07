import { CO2 } from '../../shared/ui/dom.js';
import { esc, fmtKm } from '../../shared/formato.js';
import { icon } from '../../shared/ui/icones.js';
import { priceNote } from '../carros/precos.js';
import { card } from './cartoes.js';
import { buscaHtml } from './busca-html.js';
import { rotinaHtml } from './rotina.js';
import { isNight } from './recomendacao.js';

export const telaHtml = () => `<div class="tela tela--dividida" data-mobile-view="mapa">
    <section class="painel-lateral tela__conteudo" aria-label="Planejar uma rota" data-painel>
      <div class="rotas-intro">
        <div class="rotas-intro__linha"><span class="rotas-intro__chapeu">Planejar rota</span><span class="rotas-intro__cidade">Araçatuba · SP</span></div>
        <h1 class="tela__titulo foco-titulo rs-t-display" tabindex="-1" data-titulo>Por onde a gente vai?</h1>
        <p class="tela__intro rs-t-sub">Encontre um trajeto que combine com o seu dia.</p>
      </div>
      ${buscaHtml()}
      ${rotinaHtml()}
      <details class="preferencias">
        <summary class="preferencias__summary"><strong>Preferências</strong><span>Ajuste a recomendação</span></summary>
        <div class="opcoes opcoes--grade" role="group" aria-label="Preferências de trajeto">
          <label class="opcao"><input type="checkbox" data-pref="hasBike"><span class="opcao__caixa">${icon('check')}</span>Tenho bike</label>
          <label class="opcao"><input type="checkbox" data-pref="hasCar"><span class="opcao__caixa">${icon('check')}</span>Tenho carro</label>
          <label class="opcao"><input type="checkbox" data-pref="hasMoto"><span class="opcao__caixa">${icon('check')}</span>Tenho moto</label>
          <label class="opcao"><input type="checkbox" data-pref="usesBus"><span class="opcao__caixa">${icon('check')}</span>Uso ônibus</label>
          <label class="opcao"><input type="checkbox" data-pref="walks"><span class="opcao__caixa">${icon('check')}</span>Vou a pé</label>
          <label class="opcao opcao--inteira"><input type="checkbox" data-pref="student"><span class="opcao__caixa">${icon('check')}</span>Tenho passe escolar</label>
          <label class="opcao opcao--inteira"><input type="checkbox" data-pref="accessible"><span class="opcao__caixa">${icon('check')}</span>Rota acessível: evita calçada ruim e falta de rampa</label>
        </div>
      </details>
      <button class="btn btn-success botao botao--primario botao--bloco rs-btn-primary" type="button" data-comparar>Encontrar meu caminho</button>
      <div class="visao-rota" role="group" aria-label="Visualização das rotas">
        <button type="button" class="visao-rota__botao" data-visao-rota="lista" aria-pressed="false">${icon('rota')}Lista</button>
        <button type="button" class="visao-rota__botao" data-visao-rota="mapa" aria-pressed="true">${icon('mapa')}Mapa</button>
      </div>
      <div data-resultado class="pilha" aria-live="polite"><p class="texto-2 texto-peq">As informações de quem vive na cidade ajudam a encontrar um caminho melhor.</p><button class="btn btn-outline-success botao botao--secundario botao--bloco" type="button" data-exemplo-rota>Ver um exemplo: Terminal Urbano até Praça Rui Barbosa</button></div>
    </section>
    <div class="mapa mapa--so-largo" data-mapa role="region" aria-label="Mapa do trajeto"></div>
    <div class="passos-mapa" data-passos-mapa aria-live="polite" hidden></div>
    <div class="guia" data-guia role="status" aria-live="polite" hidden></div>
  </div>`;

export const CARREGANDO = '<p role="status">Comparando rotas…</p><div class="esqueleto"></div><div class="esqueleto"></div><div class="esqueleto"></div>';

                                                                                     
export function resultadoHtml({ from, to, options, ranked, ctx, prices, now = new Date() }) {
  const hhmm = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(now);
  return `
    <div class="resultado-cabeca"><h2 class="secao-titulo">${esc(from)} até ${esc(to)}</h2>
      <p class="texto-2 texto-peq">Hoje às ${hhmm}${isNight(now) ? ', à noite' : ''}. ${fmtKm(options.find((o) => o.mode === 'foot').km)} a pé.</p></div>
    <div class="pilha" data-caronas-perto></div>
    <div class="conjunto-placa">${card(ranked.best, ctx, true)}</div>
    <div class="lista-rotas">${ranked.others.map((o) => card(o, ctx)).join('')}</div>
    <div class="pilha" data-extras><p class="texto-2 texto-peq" role="status">Buscando ônibus pelos pontos, caronas e bicicletas de aluguel…</p></div>
    <div class="pilha pilha--justa">
      <p class="texto-2 texto-peq">Custo, tempo de ônibus e ${CO2} são estimativas. ${priceNote(prices)}</p>
      <p class="texto-2 texto-peq" data-aviso-beta>As rotas a pé e de bicicleta vêm do Google em fase beta e podem não ter calçada ou ciclovia: confira o caminho no local.</p>
      <div class="acoes-rodape">
        <button class="btn btn-link botao botao--texto" type="button" data-como>Como calculamos</button>
      </div>
    </div>`;
}
