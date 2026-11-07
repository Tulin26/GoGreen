import { normalize } from '../shared/texto.js';
import { fetchDoSite } from './site.js';

                                                                                                                         
                                                                                                          
                                                                                                  

const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const titleCase = (s) => s.toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => (i > 0 && PARTICLES.has(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
const ABBREV = { r: 'rua', av: 'avenida', dr: 'doutor', dra: 'doutora', prof: 'professor', profa: 'professora', pca: 'praca', pc: 'praca', al: 'alameda', tv: 'travessa', est: 'estrada', rod: 'rodovia', jd: 'jardim', vl: 'vila', cel: 'coronel', eng: 'engenheiro', pres: 'presidente', gen: 'general', cap: 'capitao', ten: 'tenente', mal: 'marechal' };
const MIN_QUERY = 3;
const MAX_RESULTS = 6;

   
                                                                                                       
                                                                                                                                                   
   
export function parseCnefe(csv) {
  const lines = csv.split('\n');
  const head = lines[0].trim().split(';');
  const at = (name) => head.indexOf(name);
  const [iTipo, iTitulo, iNome, iNum, iBairro, iLat, iLng] = ['NOM_TIPO_SEGLOGR', 'NOM_TITULO_SEGLOGR', 'NOM_SEGLOGR', 'NUM_ENDERECO', 'DSC_LOCALIDADE', 'LATITUDE', 'LONGITUDE'].map(at);
  const streets = new Map();
  for (let k = 1; k < lines.length; k++) {
    const c = lines[k].split(';');
    const nome = c[iNome];
    const num = parseInt(c[iNum], 10);
    const lat = parseFloat(c[iLat]);
    const lng = parseFloat(c[iLng]);
    if (!nome || !(num > 0) || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const key = [c[iTipo], c[iTitulo], nome].filter(Boolean).join(' ');
    let s = streets.get(key);
    if (!s) { s = { n: titleCase(key), bairros: new Map(), nums: new Map() }; streets.set(key, s); }
    s.bairros.set(c[iBairro], (s.bairros.get(c[iBairro]) ?? 0) + 1);
    if (!s.nums.has(num)) s.nums.set(num, [Math.round(lat * 1e5), Math.round(lng * 1e5)]);
  }
  return [...streets.values()].sort((a, b) => a.n.localeCompare(b.n)).map((s) => {
    const sorted = [...s.nums.entries()].sort((a, b) => a[0] - b[0]);
    const [lat0, lng0] = sorted[0][1];
    const [bairro] = [...s.bairros.entries()].sort((a, b) => b[1] - a[1])[0];
    return { n: s.n, b: titleCase(bairro), h: [lat0, lng0, ...sorted.flatMap(([num, [la, ln]]) => [num, la - lat0, ln - lng0])] };
  });
}

                                                                                                                                       
export function expandRuas(ruas) {
  return ruas.map(({ n, b, h }) => {
    const addr = [];
    for (let i = 2; i < h.length; i += 3) addr.push({ num: h[i], lat: (h[0] + h[i + 1]) / 1e5, lng: (h[1] + h[i + 2]) / 1e5 });
    return { n, b, norm: normalize(n), addr };
  });
}

function pointFor(street, number) {
  const { addr } = street;
  if (number == null) { const mid = addr[Math.floor(addr.length / 2)]; return { point: [mid.lat, mid.lng], exact: false, approx: false }; }
  const hit = addr.find((a) => a.num === number);
  if (hit) return { point: [hit.lat, hit.lng], exact: true, approx: false };
  const lo = [...addr].reverse().find((a) => a.num < number);
  const hi = addr.find((a) => a.num > number);
  if (lo && hi) {
    const t = (number - lo.num) / (hi.num - lo.num);
    return { point: [lo.lat + (hi.lat - lo.lat) * t, lo.lng + (hi.lng - lo.lng) * t], exact: false, approx: true };
  }
  const near = lo ?? hi;
  return { point: [near.lat, near.lng], exact: false, approx: true };
}

                                                                                                         
export function searchLocal(query, ruas) {
  const tokens = normalize(query).replace(/[.,;]/g, ' ').split(/\s+/).filter(Boolean).map((t) => ABBREV[t] ?? t);
  let number = null;
  if (tokens.length > 1 && /^\d{1,5}$/.test(tokens.at(-1))) {
    number = Number(tokens.pop());
    while (['n', 'no', 'numero'].includes(tokens.at(-1))) tokens.pop();
  }
  if (tokens.join('').length < MIN_QUERY || tokens.every((t) => /^\d+$/.test(t))) return [];
  const scored = [];
  for (const s of ruas) {
    const words = s.norm.split(' ');
    if (!tokens.every((t) => words.some((w) => w.startsWith(t)))) continue;
    scored.push({ s, score: (s.norm.startsWith(tokens[0]) ? 0 : 1000) + s.norm.length });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, MAX_RESULTS).map(({ s }) => {
    const p = pointFor(s, number);
    return {
      title: number == null ? s.n : `${s.n}, ${number}`,
      subtitle: `${s.b} · Araçatuba${p.approx ? ' · número aproximado' : ''}`,
      point: p.point, exact: p.exact,
    };
  });
}

let loading = null;
                                                                                                   
export function loadRuas() {
  loading ??= fetchDoSite('/dados/enderecos.json', { timeoutMs: 60000, isValid: (j) => Array.isArray(j.ruas) && j.ruas.length > 0 })
    .then((j) => { const r = j ? expandRuas(j.ruas) : []; if (!r.length) loading = null; return r; })
    .catch(() => []);
  return loading;
}
