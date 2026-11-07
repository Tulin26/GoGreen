                                                                                                                                       
export function fakeMaps({ computeRoutes = async () => ({ routes: [] }), suggestions = [], places = [] } = {}) {
  const calls = { routes: [], autocomplete: [], search: [] };
  const libs = {
    routes: { Route: { computeRoutes: async (req) => { calls.routes.push(req); return computeRoutes(req); } } },
    places: {
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: { fetchAutocompleteSuggestions: async (req) => { calls.autocomplete.push(req); return { suggestions }; } },
      Place: { searchByText: async (req) => { calls.search.push(req); return { places }; } },
    },
  };
  return { maps: { importLibrary: async (name) => libs[name] }, calls };
}
