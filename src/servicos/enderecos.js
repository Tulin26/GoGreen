import { CITY, SEARCH_AREA } from '../config/cidade.js';
import { hasGoogleKey, importLibrary } from '../shared/mapa/google.js';

                                                                                                                             
const { minLat, maxLat, minLng, maxLng } = SEARCH_AREA;
const AREA = { west: minLng, south: minLat, east: maxLng, north: maxLat };

const num = (v) => (typeof v === 'function' ? v() : v);
const toPoint = (loc) => [num(loc.lat), num(loc.lng)];

                                                                                                            
let token = null;
const endSession = () => { token = null; };

   
                                                                                                                        
                                                                                              
   
export async function suggestPlaces(query, { signal } = {}) {
  try {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = await importLibrary('places');
    token ??= new AutocompleteSessionToken();
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query, sessionToken: token, locationRestriction: AREA, origin: { lat: CITY.center[0], lng: CITY.center[1] },
      includedRegionCodes: ['br'], language: 'pt-BR', region: 'br',
    });
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    return suggestions.filter((s) => s.placePrediction).map(({ placePrediction: p }) => ({
      title: p.mainText?.text ?? p.text.text,
      subtitle: p.secondaryText?.text ?? '',
      async resolve() {
        const place = p.toPlace();
        await place.fetchFields({ fields: ['location'] });
        endSession();
        return toPoint(place.location);
      },
    }));
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return [];
  }
}

                                                                                                          
export async function searchPlaces(query, { signal } = {}) {
  if (!hasGoogleKey()) return [];
  const { Place } = await importLibrary('places');
  const { places } = await Place.searchByText({
    textQuery: query, fields: ['displayName', 'formattedAddress', 'location'], locationRestriction: AREA,
    language: 'pt-BR', region: 'br', maxResultCount: 6,
  });
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  endSession();
  return places.map((p) => ({ title: p.displayName, subtitle: p.formattedAddress ?? '', point: toPoint(p.location) }));
}

                                                                                          
export async function findPlace(query, opts) {
  return (await searchPlaces(query, opts))[0] ?? null;
}
