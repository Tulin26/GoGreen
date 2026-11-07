import { CO2_G_PER_PKM } from '../../config/transporte.js';
import { projectOnPolyline } from '../../shared/mapa/geometria.js';

                                                                                                        
export const PREFILTER_M = 3000;

   
                                                                                                                        
                                                                                        
   
export function prefilter(geometry, { from, to }) {
  const a = projectOnPolyline(from, geometry);
  const b = projectOnPolyline(to, geometry);
  return { ok: a.offset <= PREFILTER_M && b.offset <= PREFILTER_M && a.along < b.along, pickupOffsetM: a.offset, dropoffOffsetM: b.offset };
}

export { detourSummary } from '../../servicos/desvio.js';

   
                                                                                                                                
                                                             
   
export function costOf({ extraKm, sharedKm, kmPerLiter, gasPrice, perKm = gasPrice / kmPerLiter }) {
  const extraFuel = extraKm * perKm;
  return { extraFuel, suggestedShare: (sharedKm * perKm) / 2 + extraFuel };
}

                                                                                                             
export const co2Avoided = ({ passengerKm, extraKm }) => Math.max(0, CO2_G_PER_PKM.car * (passengerKm - extraKm));

   
                                                                                                          
                                                                                                                      
                                                            
   
export function analyze({ detour, passengerKm, perKm }) {
  const extraKm = detour?.extraKm ?? 0;
  const cost = costOf({ extraKm, sharedKm: passengerKm, perKm });
  return { calculated: Boolean(detour), extraKm, extraMin: detour?.extraMin ?? 0, extraFuel: cost.extraFuel, suggestedShare: cost.suggestedShare, co2: co2Avoided({ passengerKm, extraKm }) };
}
