import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { REGIAO, parseRadaresPedagios } from '../src/servicos/radares-pedagios.js';

const OUT = 'public/dados/radares-pedagios.json';
const BBOX = `${REGIAO.minLat},${REGIAO.minLng},${REGIAO.maxLat},${REGIAO.maxLng}`;
const QUERY = `[out:json][timeout:90];(node["highway"="speed_camera"](${BBOX});node["enforcement"="maxspeed"](${BBOX});nwr["barrier"="toll_booth"](${BBOX});node["highway"="toll_gantry"](${BBOX}););out center;`;

try {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'user-agent': 'GoGreen (projeto academico)' },
    body: `data=${encodeURIComponent(QUERY)}`,
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const itens = parseRadaresPedagios(await res.json());
  mkdirSync('public/dados', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ fonte: 'OpenStreetMap (ODbL)', gerado_em: new Date().toISOString(), itens }));
  const radares = itens.filter((i) => i.tipo === 'radar').length;
  console.log(`Radares: ${radares}; pedágios: ${itens.length - radares}`);
} catch (err) {
  console.log(`Radares e pedágios: falhou (${err.message}); mantendo o arquivo anterior.`);
  if (!existsSync(OUT)) {
    mkdirSync('public/dados', { recursive: true });
    writeFileSync(OUT, JSON.stringify({ fonte: 'OpenStreetMap (ODbL)', gerado_em: null, itens: [] }));
  }
}
