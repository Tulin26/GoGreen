

const key = () => import.meta.env?.VITE_GOOGLE_MAPS_KEY ?? '';
export const hasGoogleKey = () => Boolean(key()) || Boolean(forTests);

let ready = null;
let forTests = null;

export function setGoogleForTests(maps) { forTests = maps; ready = null; }

export const authError = { failed: false };
// O Google chama esta função quando recusa a chave; o mapa escuta o evento e passa para o OpenStreetMap.
if (typeof window !== 'undefined') window.gm_authFailure = () => { authError.failed = true; window.dispatchEvent(new Event('gogreen:google-falhou')); };

function inject() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) { resolve(window.google.maps); return; }
    window.__gmapsPronto = () => resolve(window.google.maps);
    const script = document.createElement('script');
    const params = new URLSearchParams({ key: key(), v: 'weekly', loading: 'async', libraries: 'maps,marker,places', language: 'pt-BR', region: 'BR', callback: '__gmapsPronto' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error('google-nao-carregou'));
    document.head.append(script);
  });
}

export function googleMaps() {
  if (forTests) return Promise.resolve(forTests);
  if (!hasGoogleKey()) return Promise.reject(new Error('sem-chave-google'));
  ready ??= inject().catch((e) => { ready = null; throw e; });
  return ready;
}

export async function importLibrary(name) { return (await googleMaps()).importLibrary(name); }

export function googleErrorText(e) {
  if (e?.message === 'sem-chave-google') return 'O mapa do Google ainda não foi configurado: falta a chave VITE_GOOGLE_MAPS_KEY.';
  if (authError.failed) return 'O Google recusou a chave do mapa. Confira a chave e as permissões dela no Google Cloud.';
  return 'O mapa do Google não carregou. Confira a internet e tente de novo.';
}
