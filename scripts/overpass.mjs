// Consulta o Overpass (OpenStreetMap) tentando servidores espelho e repetindo, porque o principal
// recusa pedidos quando está cheio ou quando vários builds chegam em sequência.
const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const RODADAS = 2;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Devolve o JSON do primeiro servidor que responder com elementos; lança o último erro se nenhum responder. */
export async function consultarOverpass(query, { timeoutMs = 90000 } = {}) {
  let ultimo = null;
  for (let rodada = 0; rodada < RODADAS; rodada++) {
    for (const url of SERVIDORES) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'user-agent': 'GoGreen (projeto academico)', 'content-type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) throw new Error(`${new URL(url).host}: HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json?.elements)) throw new Error(`${new URL(url).host}: resposta sem elementos`);
        return json;
      } catch (err) {
        ultimo = err;
      }
    }
    if (rodada < RODADAS - 1) await espera(5000);
  }
  throw ultimo ?? new Error('Overpass indisponível');
}
