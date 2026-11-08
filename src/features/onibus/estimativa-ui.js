import { PLACES } from '../../config/lugares.js';
import { esc } from '../../shared/formato.js';
import { polylineLength, projectOnPolyline } from '../../shared/mapa/geometria.js';
import { stopLabel } from '../../shared/mapa/referencia.js';
import { icon } from '../../shared/ui/icones.js';
import { arrivalsAt, estimatedBuses, stopsOnRoute } from './estimativa.js';
import { formatWait } from './horarios.js';

const LANDMARKS = PLACES.map((p) => ({ nome: p.title, coords: p.point }));
const pct = (m, total) => `${Math.max(0, Math.min(100, (m / total) * 100)).toFixed(1)}%`;
const whenText = (a) => `${a.clock} (${formatWait(a.inMinutes)})`;

function rulerHtml(line, state, now) {
  const { path, userPoint, stops } = state;
  const total = polylineLength(path.geometry);
  const buses = estimatedBuses(line, path, now);
  const ticks = stopsOnRoute(stops, line, path, now).map((s) => `<span class="regua__ponto" style="left:${pct(s.along, total)}"></span>`).join('');
  const busHtml = buses.map((b) => `<span class="regua__onibus regua__onibus--${b.dirIndex === 0 ? 'ida' : 'volta'}" style="left:${pct(b.along, total)}" title="Saiu ${b.dirIndex === 0 ? 'do Terminal' : `de ${esc(b.fromName)}`} às ${Math.floor(b.departedMin / 60).toString().padStart(2, '0')}:${(b.departedMin % 60).toString().padStart(2, '0')}">${icon('onibus')}<span aria-hidden="true">${b.dirIndex === 0 ? '→' : '←'}</span></span>`).join('');
  const me = userPoint ? `<span class="regua__voce" style="left:${pct(projectOnPolyline(userPoint, path.geometry).along, total)}" title="Você">${icon('minhaLocalizacao')}</span>` : '';
  const label = buses.length ? `${buses.length} ${buses.length === 1 ? 'ônibus' : 'ônibus'} a caminho agora, pelo horário` : 'Nenhum ônibus a caminho agora, pelo horário';
  return `<div class="regua" role="img" aria-label="${esc(label)} entre o Terminal e ${esc(path.endName)}">
    <div class="regua__pontas"><span>Terminal</span><span>${esc(path.endName)}</span></div>
    <div class="regua__trilho">${ticks}${busHtml}${me}</div>
    <p class="texto-2 texto-peq">${label}. → sai do Terminal, ← volta do fim da linha.</p></div>`;
}

function etaHtml(line, state, now) {
  const { path, userPoint } = state;
  if (!userPoint) return '<p class="previsao__texto">Marque onde você está para ver quando o ônibus passa por aí.</p>';
  const r = arrivalsAt(userPoint, line, path, now, 3);
  if (r.offRoute) return `<p class="previsao__texto">Seu ponto fica a ${Math.round(r.offsetM)} m do trajeto estimado desta linha. Confira se a linha passa por aí.</p>`;
  if (!r.arrivals.length) return '<p class="previsao__texto">Sem saídas cadastradas para estimar a passagem por aí.</p>';
  const [first] = r.arrivals;
  return `<p class="previsao__valor">${first.inMinutes < 1 ? 'Passando' : `${Math.round(first.inMinutes)} <span class="previsao__unidade">min</span>`}</p>
    <p class="previsao__texto"><strong>Passa pelo seu ponto às ${first.clock}</strong>, saindo ${first.dirIndex === 0 ? 'do Terminal' : `de ${esc(first.fromName)}`} às ${first.departedClock}.</p>
    <ul class="lista-saidas">${r.arrivals.slice(1).map((a) => `<li><strong>${a.clock}</strong><span class="texto-2 texto-peq">${formatWait(a.inMinutes)}, ${a.dirIndex === 0 ? 'sentido fim da linha' : 'sentido Terminal'}</span></li>`).join('')}</ul>`;
}

function stopsHtml(line, state, now) {
  const { path, stops } = state;
  const list = stopsOnRoute(stops, line, path, now);
  if (!list.length) return '';
  const named = [...LANDMARKS, ...stops.filter((s) => s.nome).map((s) => ({ nome: `ponto ${s.nome}`, coords: s.coords }))];
  return `<details class="preferencias"><summary class="preferencias__summary"><strong>Pontos no trajeto</strong><span>${list.length} pontos, com a próxima passagem estimada</span></summary>
    <ul class="lista-saidas lista-pontos-onibus">${list.map((s, i) => `<li><button type="button" class="lista-pontos-onibus__item" data-ponto-trajeto="${i}" aria-label="Mostrar ${esc(stopLabel(s.stop, named))} no mapa"><span>${esc(stopLabel(s.stop, named))}</span><strong>${s.next ? whenText(s.next) : 'sem saída'}</strong></button></li>`).join('')}</ul></details>`;
}

export function estimateHtml(line, state, now = new Date()) {
  if (!state.path) return '<p class="texto-2 texto-peq" role="status">Calculando o trajeto estimado desta linha…</p>';
  return `<div class="previsao previsao--estimativa">
    <p class="linha linha--justa"><span class="selo selo--horario">${icon('relogio')}ESTIMATIVA</span><span class="frescor">Pelo horário cadastrado e um trajeto estimado até ${esc(state.path.endName)}</span></p>
    ${rulerHtml(line, state, now)}
    ${etaHtml(line, state, now)}
    ${stopsHtml(line, state, now)}
    <p class="texto-2 texto-peq">O trajeto é o caminho de carro do Terminal até o bairro, e o ônibus anda à velocidade média. Não é a posição real: o ônibus pode adiantar, atrasar ou passar por outras ruas.</p></div>`;
}

