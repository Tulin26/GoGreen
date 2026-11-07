import { BUS, MODES } from '../../config/transporte.js';
import { esc, fmtCo2, fmtMin, fmtMoney } from '../../shared/formato.js';
import { CO2 } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { carLabel } from '../carros/economia.js';
import { isCandidate } from './recomendacao.js';

function metric(label, bestLabel, value, isBest) {
  return `<div class="metrica ${isBest ? 'metrica--melhor' : ''}"><dt>${isBest ? bestLabel : label}</dt><dd>${value}</dd></div>`;
}

function noteFor(o, ctx) {
  const notes = [];
  if (o.mode === 'bike' && !ctx.prefs.hasBike) notes.push('Marque "Tenho bike" para entrar na recomendação');
  if (o.mode === 'bike' && ctx.prefs.hasBike && ctx.prefs.accessible) notes.push('Fica fora da recomendação com a rota acessível');
  if (o.mode === 'car' && !o.choice && !ctx.prefs.hasCar) notes.push('Marque "Tenho carro" para entrar na recomendação');
  if (o.mode === 'car' && !o.choice) notes.push('Estimativa geral. <a href="#/perfil">Cadastre seu carro</a> para calcular com o consumo dele');
  if (o.mode === 'moto' && !ctx.prefs.hasMoto) notes.push('Marque "Tenho moto" para entrar na recomendação');
  if (o.mode === 'foot' && !ctx.prefs.walks) notes.push('Marque "Vou a pé" para entrar na recomendação');
  else if (o.mode === 'foot' && !isCandidate(o, ctx.prefs)) notes.push('Longe demais para recomendar a pé');
  if (o.mode === 'bus' && !ctx.prefs.usesBus) notes.push('Marque "Uso ônibus" para entrar na recomendação');
  return notes;
}

function carChoiceText(o) {
  const { choice, otherChoices } = o;
  const main = `<strong>${esc(carLabel(choice.car))} com ${choice.fuelLabel}</strong> (${choice.kwh ? `${String(Math.round(choice.kwh * 1000) / 10).replace('.', ',')} kWh a cada 100 km` : `${String(choice.kml).replace('.', ',')} km/l`}${choice.car.origem_consumo === 'inmetro' ? ', Inmetro' : ''}).`;
  const others = otherChoices.slice(0, 3).map((c) => `${esc(carLabel(c.car))} com ${c.fuelLabel}: ${fmtMoney(c.money)}`).join('; ');
  return others ? `${main} Outras opções: ${others}.` : main;
}

function busSource() {
  return `<p class="linha linha--justa"><span class="selo selo--horario">${icon('relogio')}ESTIMATIVA</span><span class="frescor">com ${BUS.waitMin} min de espera e ${BUS.accessWalkMin} min a pé</span></p><a class="btn btn-link botao botao--texto botao--voltar" href="#/onibus">Ver linhas e horários</a>`;
}

export function card(o, ctx, featured = false) {
  const b = ctx.best;
  const metrics = `<dl class="metricas">
    ${metric(o.mode === 'bus' ? 'tempo total' : 'tempo', 'mais rápido', fmtMin(o.minutes), b.minutes(o))}
    ${metric('custo', 'mais barato', fmtMoney(o.money), b.money(o))}
    ${metric(CO2, `menos ${CO2}`, fmtCo2(o.co2), b.co2(o))}
  </dl>`;
  const notes = noteFor(o, ctx).map((n) => `<p class="cartao-rota__nota">${n}</p>`).join('');
  const extra = [];
  if (o.choice) extra.push(carChoiceText(o));
  if (o.mode === 'moto') extra.push('Estimativa de moto a gasolina: 35 km/L e 66 g de CO₂ por km. O valor real varia conforme o modelo e a condução.');
  if (o.estimated) extra.push('Distância aproximada: o serviço de rotas não respondeu.');
  const extraHtml = extra.map((n) => `<p class="cartao-rota__aviso">${n}</p>`).join('');
  const walk = `<div class="cartao-rota__acoes"><button class="btn btn-link botao botao--texto" type="button" data-caminho="${o.mode}">Ver caminho</button><button class="btn btn-success botao botao--primario" type="button" data-iniciar-base="${o.mode}">Iniciar rota</button></div>`;
  if (featured) {
    return `<article class="card cartao-rota cartao-rota--recomendada" aria-label="Recomendação: ${MODES[o.mode].label}">
      <div class="card-body cartao-rota__corpo">
        <p class="cartao-rota__chamada">Melhor jeito hoje</p>
        <div class="cartao-rota__cabeca"><span class="modo ${MODES[o.mode].css}">${icon(MODES[o.mode].icon)}</span>
          <div class="pilha pilha--justa"><h3 class="cartao-rota__nome">${MODES[o.mode].label}</h3>${o.mode === 'bus' ? busSource() : ''}</div></div>
        ${metrics}${extraHtml}
        ${walk}
      </div></article>`;
  }
  return `<article class="card cartao-rota"><div class="card-body cartao-rota__corpo">
    <div class="cartao-rota__cabeca"><span class="modo ${MODES[o.mode].css}">${icon(MODES[o.mode].icon)}</span>
      <div><h3 class="cartao-rota__nome">${MODES[o.mode].label}</h3>${notes}</div></div>
    ${o.mode === 'bus' ? busSource() : ''}
    ${metrics}${extraHtml}${walk}
  </div></article>`;
}
