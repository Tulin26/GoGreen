import { BUS } from '../../config/transporte.js';
import { pointAlong, polylineLength, projectOnPolyline } from '../../shared/mapa/geometria.js';
import { dayType, localParts } from './horarios.js';

                                                                                                                          
                                                                                                                                
const MAX_OFFSET_M = 400;                                                                                       
const STOP_BUFFER_M = 150;
const projectedStopsCache = new WeakMap();

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const clock = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const nowMinutes = (now) => localParts(now).minutes + now.getSeconds() / 60;
const departuresOn = (dir, date) => (dir?.[dayType(localParts(date).weekday)] ?? []).map(toMin);

                                                                                   
export const tripMinutes = (km) => (km / BUS.kmh) * 60;

   
                                                                                                                        
                                                                                                          
                                                                         
   
export function estimatedBuses(line, path, now = new Date()) {
  const total = polylineLength(path.geometry);
  const duration = tripMinutes(path.km ?? total / 1000);
  const nm = nowMinutes(now);
  const out = [];
  line.directions.forEach((dir, i) => {
    const way = i === 0 ? path.geometry : [...path.geometry].reverse();
    for (const dep of departuresOn(dir, now)) {
      const elapsed = nm - dep;
      if (elapsed < 0 || elapsed > duration) continue;
      const fraction = elapsed / duration;
      out.push({ dirIndex: i, fromName: dir.from, departedMin: dep, fraction, along: i === 0 ? fraction * total : (1 - fraction) * total, point: pointAlong(way, fraction) });
    }
  });
  return out;
}

   
                                                                                                                       
                                                                                              
                                                                                                                             
   
export function arrivalsAt(point, line, path, now = new Date(), count = 3) {
  const total = polylineLength(path.geometry);
  const duration = tripMinutes(path.km ?? total / 1000);
  const { along, offset } = projectOnPolyline(point, path.geometry);
  if (offset > MAX_OFFSET_M) return { offRoute: true, offsetM: offset, arrivals: [] };
  const nm = nowMinutes(now);
  const tomorrow = new Date(now.getTime() + 86400000);
  const found = [];
  line.directions.forEach((dir, i) => {
    const travelled = i === 0 ? along : total - along;
    const pass = (travelled / total) * duration;
    for (const [date, shift] of [[now, 0], [tomorrow, 1440]]) {
      for (const dep of departuresOn(dir, date)) {
        const arrival = dep + shift + pass;
        if (arrival >= nm - 0.5) found.push({ inMinutes: arrival - nm, clock: clock(arrival), dirIndex: i, fromName: dir.from, departedClock: clock(dep) });
      }
    }
  });
  found.sort((a, b) => a.inMinutes - b.inMinutes);
  return { offRoute: false, offsetM: offset, arrivals: found.slice(0, count) };
}

   
                                                                                                                  
                                                                                            
   
export function stopsOnRoute(stops, line, path, now = new Date()) {
  let cached = projectedStopsCache.get(path);
  if (!cached || cached.stops !== stops) {
    const near = stops
      .map((stop) => ({ stop, ...projectOnPolyline(stop.coords, path.geometry) }))
      .filter((s) => s.offset <= STOP_BUFFER_M)
      .sort((a, b) => a.along - b.along);
    cached = { stops, selected: near };
    projectedStopsCache.set(path, cached);
  }
  return cached.selected.map((s) => ({ stop: s.stop, along: s.along, next: arrivalsAt(s.stop.coords, line, path, now, 1).arrivals[0] ?? null }));
}

