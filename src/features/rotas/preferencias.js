import { session } from '../../shared/estado.js';
import { prefs } from '../../shared/preferencias.js';

   
                                                                                                   
                                                                                           
   
export function readRoutePrefs({ hasCars = false, hasMotos = false } = {}) {
  const profile = session.user?.transportes?.length ? session.user.transportes : null;
  const mode = (pref, key, fallback) => prefs.get(pref, profile ? profile.includes(key) : fallback);
  return {
    hasCar: mode('hasCar', 'carro', hasCars),
    hasMoto: mode('hasMoto', 'moto', hasMotos),
    hasBike: mode('hasBike', 'bike', false),
    usesBus: mode('usesBus', 'onibus', true),
    walks: mode('walks', 'ape', true),
    student: prefs.get('student', false),
    accessible: prefs.get('accessible', false),
  };
}
