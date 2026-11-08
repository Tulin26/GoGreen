import { MODES } from '../../config/transporte.js';
import { CO2 } from '../../shared/ui/dom.js';
import { esc, fmtCo2, fmtKm, fmtMin } from '../../shared/formato.js';
import { icon } from '../../shared/ui/icones.js';

const LABEL = { bus: 'Ônibus pelos pontos', bikeRental: 'Bicicleta de aluguel', carpool: 'Carona' };
const LOOK = { bus: 'bus', bikeRental: 'bike', carpool: 'car' };

function detailHtml(o) {
  const d = o.detail;
  if (o.mode === 'bus') return `Embarque no ${esc(d.boardLabel)} e desça no ${esc(d.alightLabel)}. Passa por ${d.stopsPassed.length} pontos.`;
  if (o.mode === 'carpool') {
    const where = d.meeting ? esc(d.meeting) : 'um ponto no caminho dele';
    return `${esc(d.ride.motorista)} sai às ${esc(d.ride.hora)}. Encontre em ${where} (a ${Math.round(d.walkToBoardM)} m de você).${d.drop ? ` Desça em ${esc(d.drop)}.` : ''}`;
  }
  return `Caminhe ${Math.round(d.walkToM)} m até ${esc(d.from.nome)}, pedale até ${esc(d.to.nome)} e caminhe ${Math.round(d.walkFromM)} m até o destino.`;
}

export function extraCardHtml(o, i) {
  const look = MODES[LOOK[o.mode]];
  const tags = [o.estimated ? 'estimado' : '', o.isExample ? 'exemplo' : ''].filter(Boolean).map((t) => `<span class="selo selo--horario">${t}</span>`).join(' ');
  const ask = o.mode === 'carpool' ? '<a class="btn btn-outline-success botao botao--secundario" href="#/caronas">Ver caronas</a>' : '';
  return `<article class="card cartao-rota"><div class="card-body cartao-rota__corpo">
    <div class="cartao-rota__cabeca"><span class="modo ${look.css}">${icon(look.icon)}</span><div><h3 class="cartao-rota__nome">${LABEL[o.mode]} ${tags}</h3></div></div>
    <p class="trajeto__horario">Saia às <strong>${esc(o.leaveAt)}</strong> · chega às <strong>${esc(o.arriveAt)}</strong></p>
    <p>${fmtMin(o.minutes)} · ${fmtKm(o.km)} · evita <strong>${fmtCo2(o.avoided.day)}</strong> de ${CO2} por dia (${fmtCo2(o.avoided.month)} por mês)</p>
    <p class="texto-2">${detailHtml(o)}</p>
    <div class="cartao-rota__acoes"><button class="btn btn-link botao botao--texto" type="button" data-extra="${i}">Ver rota e passo a passo</button><button class="btn btn-success botao botao--primario" type="button" data-iniciar="${i}">Iniciar rota</button>${ask}</div>
    <div data-passos="${i}" aria-live="polite"></div>
  </div></article>`;
}

export const passosHtml = (steps) => `<ol class="passos">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;

export const extrasHtml = (extras) => (extras.length
  ? `<h2 class="secao-titulo">Mais jeitos de ir</h2><div class="lista-rotas">${extras.map(extraCardHtml).join('')}</div>`
  : '<p class="texto-2 texto-peq">Sem ônibus pelos pontos, carona ou bicicleta de aluguel para este trajeto agora.</p>');
