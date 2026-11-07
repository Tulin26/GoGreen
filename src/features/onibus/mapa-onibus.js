import { stopsOnRoute } from './estimativa.js';

                                                                                   
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

                                                                             
export function drawBuses(handle, layer, line, { positions, userPoint }, fitToLive = true) {
  if (!handle || !layer) return;
  layer.clear();
  const live = positions.filter((p) => p.line_code === line.code);
  for (const p of live) layer.pin([p.lat, p.lng], { css: 'pino--onibus', ic: 'onibus', title: `Ônibus da linha ${line.code}` });
  if (userPoint) layer.pin(userPoint, { ic: 'minhaLocalizacao', title: 'Você' });
  const points = [...live.map((p) => [p.lat, p.lng]), ...(userPoint ? [userPoint] : [])];
  if (fitToLive) {
    if (points.length > 1) handle.fit(points);
    else if (points.length === 1) handle.setView(points[0], 15);
  }
}
