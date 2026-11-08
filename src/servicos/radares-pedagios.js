import { haversine } from '../shared/mapa/geometria.js';
import { fetchDoSite } from './site.js';

/** Região baixada no build: Araçatuba e as rodovias em volta (cerca de 35 km), para pegar os pedágios de quem sai da cidade. */
export const REGIAO = { minLat: -21.55, maxLat: -20.95, minLng: -50.8, maxLng: -50.1 };

/** Cabines a menos disto (em metros) são a mesma praça de pedágio: o OpenStreetMap marca cada cabine. */
const MESMA_PRACA_M = 300;

const ehRadar = (t) => t.highway === 'speed_camera' || t.enforcement === 'maxspeed';
const ehPedagio = (t) => t.barrier === 'toll_booth' || t.highway === 'toll_gantry';

/** Velocidade do radar em km/h, a partir da etiqueta maxspeed do OpenStreetMap ("60", "60 km/h"). Sem número, null. */
export function velocidade(tags) {
  const n = parseInt(String(tags?.maxspeed ?? ''), 10);
  return n > 0 ? n : null;
}

/** Lê a resposta do Overpass: nós têm lat/lon; vias e relações (praças de pedágio desenhadas como área) vêm com center. */
export function parseRadaresPedagios(json) {
  const vistos = new Set();
  const lista = [];
  for (const e of json?.elements ?? []) {
    const tags = e.tags ?? {};
    const tipo = ehRadar(tags) ? 'radar' : ehPedagio(tags) ? 'pedagio' : null;
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (!tipo || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const id = `${e.type}/${e.id}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    const coords = [lat, lng];
    if (tipo === 'pedagio') {
      const praca = lista.find((i) => i.tipo === 'pedagio' && haversine(i.coords, coords) < MESMA_PRACA_M);
      if (praca) { praca.nome ??= tags.name ?? null; continue; }
    }
    lista.push({ id, tipo, coords, nome: tags.name ?? null, velocidade: tipo === 'radar' ? velocidade(tags) : null });
  }
  return lista;
}

/** Texto curto que aparece ao tocar no símbolo do mapa. */
export function descrever(item) {
  if (item.tipo === 'radar') return item.velocidade ? `Radar de velocidade: ${item.velocidade} km/h` : 'Radar de velocidade';
  return item.nome ? `Pedágio: ${item.nome}` : 'Pedágio';
}

export async function loadRadaresPedagios() {
  const json = await fetchDoSite('/dados/radares-pedagios.json', { isValid: (j) => Array.isArray(j.itens) });
  return json?.itens ?? [];
}
