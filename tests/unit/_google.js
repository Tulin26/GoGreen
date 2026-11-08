const MODO = { foot: 'WALKING', bike: 'BICYCLING', car: 'DRIVING' };

/** Troca o fetch por um servidor de rotas falso (formato OSRM). handler recebe { origin, destination, travelMode, intermediates?, computeAlternativeRoutes }. */
export function instalarRotas(handler = async () => ({ routes: [] }), calls = { routes: [] }) {
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    const m = u.pathname.match(/routed-(foot|bike|car)\/route\/v1\/driving\/(.+)$/);
    if (!m) throw new Error(`fetch inesperado: ${url}`);
    const pts = decodeURIComponent(m[2]).split(';').map((p) => { const [lng, lat] = p.split(',').map(Number); return { lat, lng }; });
    const req = { origin: pts[0], destination: pts.at(-1), travelMode: MODO[m[1]], computeAlternativeRoutes: u.searchParams.get('alternatives') === 'true' };
    if (pts.length > 2) req.intermediates = pts.slice(1, -1).map((location) => ({ location }));
    calls.routes.push(req);
    const { routes } = await handler(req);
    const body = routes.length
      ? { code: 'Ok', routes: routes.map((r) => ({ distance: r.distanceMeters, duration: r.durationMillis / 1000, geometry: { coordinates: r.path.map((p) => [p.lng, p.lat]) } })) }
      : { code: 'NoRoute', routes: [] };
    return { ok: true, status: 200, json: async () => body };
  };
  return calls;
}

/** Servidor de rotas fora do ar. */
export function rotasForaDoAr() {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
}

export function fakeMaps({ computeRoutes = async () => ({ routes: [] }), suggestions = [], places = [] } = {}) {
  const calls = { routes: [], autocomplete: [], search: [] };
  instalarRotas(computeRoutes, calls);
  const libs = {
    places: {
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: { fetchAutocompleteSuggestions: async (req) => { calls.autocomplete.push(req); return { suggestions }; } },
      Place: { searchByText: async (req) => { calls.search.push(req); return { places }; } },
    },
  };
  return { maps: { importLibrary: async (name) => libs[name] }, calls };
}
