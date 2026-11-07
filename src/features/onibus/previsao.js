import { BUS } from '../../config/transporte.js';
import { esc, fmtAgo } from '../../shared/formato.js';
import { haversine } from '../../shared/mapa/geometria.js';
import { icon } from '../../shared/ui/icones.js';
import { DAY_LABEL, formatWait, nextDepartures } from './horarios.js';

                                                 
export const fromName = (name) => (/^(Terminal|Bairro)$/.test(name) ? `do ${name}` : `de ${esc(name)}`);

                                                                                                  
export function prediction(line, state) {
  const { dirIndex, positions, userPoint, lastDistance } = state;
  const dir = line.directions[dirIndex] ?? line.directions[0];
  const live = positions.filter((p) => p.line_code === line.code);
  if (live.length) {
    const latest = live.reduce((a, b) => (new Date(a.recorded_at) > new Date(b.recorded_at) ? a : b));
    const ageSec = (Date.now() - new Date(latest.recorded_at).getTime()) / 1000;
    const fresh = ageSec <= BUS.freshSec;
    let value = '';
    let text = '<strong>O ônibus está no mapa.</strong> Use sua localização ou marque no mapa para ver a previsão de chegada.';
    if (userPoint) {
      const closest = live.reduce((a, b) => (haversine([a.lat, a.lng], userPoint) < haversine([b.lat, b.lng], userPoint) ? a : b));
      const meters = haversine([closest.lat, closest.lng], userPoint);
      const min = ((meters * 1.3) / 1000 / BUS.kmh) * 60;
      const prev = lastDistance.get(closest.token);
      const away = prev !== undefined && meters > prev + 50;
      lastDistance.set(closest.token, meters);
      value = min < 1 ? 'Chegando' : `${fresh ? '' : 'cerca de '}${Math.round(min)} <span class="previsao__unidade">min</span>`;
      text = away
        ? 'O ônibus parece estar se afastando de você. Pode ser o sentido contrário.'
        : 'Estimativa pela distância até você. Como não temos o itinerário da linha, confira o sentido.';
    } else {
      value = '';
    }
    const who = live.length > 1 ? `${live.length} passageiros` : '1 passageiro';
    const fresco = fresh ? `Atualizado ${fmtAgo(latest.recorded_at)} por ${who}` : `Última posição ${fmtAgo(latest.recorded_at)}`;
    return { kind: 'live', html: `<div class="previsao">
      <p class="linha linha--justa"><span class="selo selo--aovivo">${icon('aoVivo')}AO VIVO</span><span class="frescor">${fresco}</span></p>
      ${value ? `<p class="previsao__valor">${value}</p>` : ''}<p class="previsao__texto">${text}</p></div>` };
  }
  if (!dir) return { kind: 'none', html: '' };
  const next = nextDepartures(dir, new Date(), 3);
  if (!next.length) return { kind: 'none', html: '' };
  const first = next[0];
  const value = first.time;
  const when = first.today ? formatWait(first.inMinutes) : `no próximo ${DAY_LABEL[first.day]}`;
  const noMoreToday = !first.today;
  return {
    kind: 'horario',
    html: `<div class="previsao previsao--horario">
      <p class="linha linha--justa"><span class="selo selo--horario">${icon('relogio')}HORÁRIO</span><span class="frescor">Ninguém informando esta linha agora</span></p>
      ${noMoreToday ? '<p class="secao-titulo">Sem mais saídas hoje</p>' : ''}
      <p class="previsao__valor">${value}</p>
      <p class="previsao__texto"><strong>Saída ${fromName(dir.from)}, ${when}.</strong> Previsão pelo horário cadastrado. Não sabemos onde o ônibus está, então ele pode adiantar ou atrasar.</p></div>`,
    next,
  };
}
