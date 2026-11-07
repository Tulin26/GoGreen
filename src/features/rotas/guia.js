import { distanceToPolyline, haversine } from '../../shared/mapa/geometria.js';

const ARRIVE_M = 30;
const MAX_SLACK_M = 50;                                                        
const OFF_ROUTE_M = 60;

   
                                                                                                                   
                                                                                                  
                                                                                                          
   
export function createGuide(legs) {
  let i = 0;
  return {
    update({ point, accuracy = 0 }) {
      if (!legs.length) return { legIndex: 0, step: '', distToLegEndM: 0, off: false, offRouteM: 0, arrived: true };
      const slack = Math.max(ARRIVE_M, Math.min(accuracy, MAX_SLACK_M));
      const end = (n) => legs[n].geometry.at(-1);
      while (i < legs.length - 1 && haversine(point, end(i)) <= slack) i += 1;
      const distToLegEndM = haversine(point, end(i));
      const offRouteM = distanceToPolyline(point, legs[i].geometry);
      return {
        legIndex: i,
        step: legs[i].step,
        distToLegEndM,
        offRouteM,
        off: offRouteM > Math.max(OFF_ROUTE_M, accuracy * 1.5),
        arrived: i === legs.length - 1 && distToLegEndM <= slack,
      };
    },
  };
}
