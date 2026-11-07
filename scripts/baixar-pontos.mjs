

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseOverpass } from '../src/servicos/pontos-onibus.js';

const OUT = 'public/dados/pontos-onibus.json';
const QUERY = '[out:json][timeout:60];area["name"="Araçatuba"]["boundary"="administrative"]->.a;node["highway"="bus_stop"](area.a);out;';

try {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'user-agent': 'GoGreen (projeto academico)' },
    body: `data=${encodeURIComponent(QUERY)}`,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const pontos = parseOverpass(await res.json());
  if (!pontos.length) throw new Error('nenhum ponto');
  mkdirSync('public/dados', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ fonte: 'OpenStreetMap (ODbL)', gerado_em: new Date().toISOString(), pontos }));
  console.log(`Pontos de ônibus: ${pontos.length}`);
} catch (err) {
  console.log(`Pontos de ônibus: falhou (${err.message}); mantendo o arquivo anterior.`);
  if (!existsSync(OUT)) {
    mkdirSync('public/dados', { recursive: true });
    writeFileSync(OUT, JSON.stringify({ fonte: 'OpenStreetMap (ODbL)', gerado_em: null, pontos: [] }));
  }
}
