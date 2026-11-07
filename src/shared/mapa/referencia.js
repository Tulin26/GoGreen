import { haversine } from './geometria.js';

const NEAR_M = 300;

   
                                                                                                                   
                                                                      
   
export function meetingPoint(point, landmarks) {
  const named = landmarks.filter((l) => l.nome);
  if (!named.length) return null;
  const [best, d] = named.map((l) => [l, haversine(point, l.coords)]).reduce((a, b) => (b[1] < a[1] ? b : a));
  return d <= NEAR_M ? best.nome : `a ${Math.round(d)} m de ${best.nome}`;
}

                                                                                                               
export function stopLabel(stop, landmarks) {
  if (stop.nome) return `ponto ${stop.nome}`;
  const near = meetingPoint(stop.coords, landmarks);
  if (!near) return 'ponto de ônibus';
  return near.startsWith('a ') ? `ponto de ônibus ${near}` : `ponto de ônibus perto de ${near}`;
}
