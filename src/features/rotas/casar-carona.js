import { MATCH } from '../../config/trajeto.js';
import { distanceToPolyline, haversine, polylineLength } from '../../shared/mapa/geometria.js';

export const toMinutes = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };

function nearestIndex(point, line) {
  let best = 0;
  line.forEach((v, i) => { if (haversine(point, v) < haversine(point, line[best])) best = i; });
  return best;
}

   
                                                                               
                                                                                                                                        
   
export function matchRide({ from, to, hora }, { geometry, hora: rideHora }, { maxMinutes = MATCH.maxMinutes } = {}) {
  if (!geometry || geometry.length < 2) return null;
  if (Math.abs(toMinutes(hora) - toMinutes(rideHora)) > maxMinutes) return null;
  const walkToBoardM = distanceToPolyline(from, geometry);
  const walkFromAlightM = distanceToPolyline(to, geometry);
  if (walkToBoardM > MATCH.maxM || walkFromAlightM > MATCH.maxM) return null;
  const boardIdx = nearestIndex(from, geometry);
  const alightIdx = nearestIndex(to, geometry);
  if (boardIdx >= alightIdx) return null;
  return {
    walkToBoardM, walkFromAlightM, boardPoint: geometry[boardIdx], alightPoint: geometry[alightIdx],
    sharedKm: polylineLength(geometry.slice(boardIdx, alightIdx + 1)) / 1000,
  };
}
