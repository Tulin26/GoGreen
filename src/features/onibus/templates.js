import { session } from '../../shared/estado.js';
import { esc } from '../../shared/formato.js';
import { estado } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { DAY_LABEL, formatWait } from './horarios.js';
import { LINES, TIMETABLE_SOURCE } from '../../config/linhas-onibus.js';
import { countText, linesListHtml } from './escolha.js';
import { fromName, prediction } from './previsao.js';

export const sentText = (t) => `${t.sent ?? 0} ${t.sent === 1 ? 'posição enviada' : 'posições enviadas'}.`;

export function pickerHtml() {
  return `<div class="tela__conteudo tela__conteudo--estreito onibus-escolha">
    <h1 class="tela__titulo foco-titulo" tabindex="-1">Qual ônibus você espera?</h1>
    <p class="texto-2">Linhas da TUA em Araçatuba. Escolha uma para ver os horários e onde o ônibus deve estar agora.</p>
    <div class="onibus-busca"><label class="sr-only" for="linha-filtro">Buscar linha</label>
      <input class="form-control entrada" id="linha-filtro" type="search" placeholder="Buscar por número ou bairro" autocomplete="off" enterkeyhint="search" data-filtro-linha></div>
    <p class="onibus-busca__contagem texto-2 texto-peq" role="status" data-linhas-contagem>${countText(LINES.length)}</p>
    <ul class="sugestoes lista-linhas" data-lista-linhas>${linesListHtml(LINES)}</ul>
    <div class="vazio" data-linhas-vazio hidden><p class="vazio__titulo">Nenhuma linha encontrada</p><p class="texto-2">Tente o número da linha ou parte do nome do bairro.</p></div>
  </div>`;
}

function departuresHtml(next) {
  const later = next?.slice(1) ?? [];
  if (!later.length) return '';
  return `<div class="pilha pilha--media"><h2 class="secao-titulo">Depois dessa</h2>
    <ul class="lista-saidas">${later.map((n) => `<li><strong>${n.time}</strong><span class="texto-2 texto-peq">${n.today ? formatWait(n.inMinutes) : DAY_LABEL[n.day]}</span></li>`).join('')}</ul></div>`;
}

export function reportingHtml() {
  const t = session.trip;
  return `<div class="informando">
    <p class="linha linha--justa"><span class="selo selo--aovivo">${icon('aoVivo')}AO VIVO</span><span class="frescor" data-sem-rede ${t.offline ? '' : 'hidden'}>Sem internet. Tentando reconectar…</span></p>
    <h3 class="estado__titulo">Você está informando a linha ${esc(t.line)}</h3>
    <p class="estado__texto">Quem está no ponto já vê o ônibus. Mantenha a tela ligada. <span data-enviadas>${sentText(t)}</span></p>
    <button class="btn btn-danger botao botao--parar botao--bloco" type="button" data-parar>Parar de informar</button></div>`;
}

export function sheetHtml(line, state) {
  const { dirIndex, userPoint } = state;
  const pred = prediction(line, state);
  const dirs = line.directions.length > 1
    ? `<div class="sentidos" role="group" aria-label="Sentido">${line.directions.map((d, i) => `<button class="opcao" type="button" aria-pressed="${i === dirIndex}" data-sentido="${i}">Saindo ${fromName(d.from)}</button>`).join('')}</div>`
    : '';
  const noData = pred.kind === 'none' && !line.directions.length;
  return `
    <div class="placa placa--azul"><div class="linha-onibus">
      <span class="modo">${icon('onibus')}</span>
      <div class="linha-onibus__texto"><h1 class="linha-onibus__nome foco-titulo" tabindex="-1">Linha ${line.code} ${esc(line.name)}</h1>
        <p class="linha-onibus__ponto">${userPoint ? 'Você marcou sua posição' : 'TUA Transportes Urbanos Araçatuba'}</p></div>
      <button class="btn btn-outline-light botao botao--secundario botao--trocar" type="button" data-trocar>Trocar linha</button></div></div>
    ${dirs}
    <p class="sr-only" aria-live="polite" data-previsao-sr></p>
    <div data-previsao>${noData
      ? estado({ ic: 'relogio', titulo: 'Esta linha não tem horário cadastrado', texto: `Sem aviso de passageiros e sem tabela, não dá para prever a chegada. <a href="${TIMETABLE_SOURCE.base}${line.slug}/" target="_blank" rel="noopener">Ver a página da linha</a>.`, acao: '<button class="btn btn-outline-success botao botao--secundario" type="button" data-trocar>Escolher outra linha</button>' })
      : pred.html}</div>
    ${departuresHtml(pred.next)}
    ${(pred.kind === 'live' || pred.hasEstimate) ? `<div class="detalhe__acoes"><button class="btn btn-outline-success botao botao--secundario" type="button" data-gps>${icon('minhaLocalizacao')}Usar minha localização</button><button class="btn btn-outline-success botao botao--secundario" type="button" data-marcar>${icon('mapa')}Marcar no mapa</button></div>` : ''}
    ${session.trip
      ? reportingHtml()
      : `<div class="pilha pilha--media"><button class="btn btn-success botao botao--primario botao--bloco" type="button" data-informar>${icon('onibus')}Estou neste ônibus</button>
         <p class="campo__ajuda">${pred.kind === 'live' ? 'Avisa quem está no ponto. Sua localização vai sem nome, só enquanto você informar.' : 'Seja a primeira pessoa a informar. Quem está no ponto passa a ver o ônibus ao vivo.'}</p></div>`}
    <div class="pilha pilha--justa">
      <p class="texto-2 texto-peq">Horários de <a href="${TIMETABLE_SOURCE.base}${line.slug}/" target="_blank" rel="noopener">${TIMETABLE_SOURCE.name}</a>, atualizados em ${TIMETABLE_SOURCE.updated}. Feriados podem mudar o quadro. Confirme com a TUA.</p>
    </div>`;
}
