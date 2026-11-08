

import { consultarOverpass } from './overpass.mjs';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { SEARCH_AREA } from '../src/config/cidade.js';
import { parseOverpass } from '../src/servicos/pontos-onibus.js';

const OUT = 'public/dados/pontos-onibus.json';
// Busca pela área da cidade, e não pelo nome: "Araçatuba" também é nome de lugar em Santa Catarina.
const BBOX = `${SEARCH_AREA.minLat},${SEARCH_AREA.minLng},${SEARCH_AREA.maxLat},${SEARCH_AREA.maxLng}`;
const QUERY = `[out:json][timeout:60];node["highway"="bus_stop"](${BBOX});out;`;

try {
  const pontos = parseOverpass(await consultarOverpass(QUERY));
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
