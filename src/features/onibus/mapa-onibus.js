import { estimatedBuses, stopsOnRoute } from './estimativa.js';

const clockOf = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function drawBusRoute(layer, line, path, stops, now = new Date()) {
  if (!layer || !path) return;
  layer.clear();
  layer.line(path.geometry, { color: '#0B4A9E', dashed: true });
  layer.pin(path.geometry[0], { ic: 'ponto', title: 'Terminal Urbano' });
  layer.pin(path.geometry.at(-1), { ic: 'destino', title: path.endName });
  for (const { stop, next } of stopsOnRoute(stops, line, path, now)) {
    const time = next?.clock ?? '—';
    const stopName = stop.nome || 'Ponto de ônibus';
    const direction = next ? `, sentido ${next.dirIndex === 0 ? path.endName : 'Terminal'}` : '';
    layer.pin(stop.coords, {
      css: 'pino--ponto', ic: 'ponto', title: `${stopName}: passagem estimada ${time}${direction}`,
      extra: `<span class="pino__tag">${time}</span>`,
    });
  }
}

export function drawBuses(handle, layer, line, { positions, userPoint, path }, fitToLive = true) {
  if (!handle || !layer) return;
  layer.clear();
  const live = positions.filter((p) => p.line_code === line.code);
  for (const p of live) layer.pin([p.lat, p.lng], { css: 'pino--onibus', ic: 'onibus', title: `Ônibus da linha ${line.code}` });
  if (path) {
    for (const b of estimatedBuses(line, path, new Date())) {
      layer.pin(b.point, { css: 'pino--onibus pino--estimado', ic: 'onibus', title: `Ônibus estimado da linha ${line.code}, saiu ${b.dirIndex === 0 ? 'do Terminal' : `de ${b.fromName}`} às ${clockOf(b.departedMin)}`, extra: '<span class="pino__tag">EST</span>' });
    }
  }
  if (userPoint) layer.pin(userPoint, { ic: 'minhaLocalizacao', title: 'Você' });
  const points = [...live.map((p) => [p.lat, p.lng]), ...(userPoint ? [userPoint] : [])];
  if (fitToLive) {
    if (points.length > 1) handle.fit(points);
    else if (points.length === 1) handle.setView(points[0], 15);
  }
}
