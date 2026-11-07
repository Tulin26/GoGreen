

const R = (marca, modelo, versao, motor) => ({ marca, modelo, versao, motor });
const TABELA_2017_2019 = { ranges: R([75, 125], [125, 165], [165, 245], [245, 275]), combustivel: 380, co2Etanol: 513, co2Gasolina: 540, etCidade: 566, etEstrada: 590, gasCidade: 614, gasEstrada: 639 };

export const LAYOUTS = {
  2026: { marca: 215, modelo: 245, versao: 279, motor: 302, propulsao: 315, combustivel: 380, co2Etanol: 440, co2Gasolina: 456, etCidade: 475, etEstrada: 485, gasCidade: 509, gasEstrada: 519, mj: 592 },
  2025: { marca: 91, modelo: 134, versao: 176, motor: 211, propulsao: 236, combustivel: 335, co2Etanol: 455, co2Gasolina: 474, etCidade: 512, etEstrada: 529, gasCidade: 545, gasEstrada: 562, mj: 632 },
  2024: { marca: 90, modelo: 123, versao: 181, motor: 225, propulsao: 250, combustivel: 351, co2Etanol: 456, co2Gasolina: 473, etCidade: 512, etEstrada: 528, gasCidade: 542, gasEstrada: 558, mj: 628 },
  2023: { marca: 107, modelo: 143, versao: 195, motor: 243, propulsao: 272, combustivel: 382, co2Etanol: 490, co2Gasolina: 506, etCidade: 542, etEstrada: 561, gasCidade: 577, gasEstrada: 596, mj: 659 },
  2022: { marca: 79, modelo: 113, versao: 153, motor: 181, propulsao: 199, combustivel: 284, co2Etanol: 370, co2Gasolina: 381, etCidade: 396, etEstrada: 410, gasCidade: 423, gasEstrada: 437, mj: 456 },
  2021: { rotated: true, rowGap: 2, ranges: R([80, 135], [135, 195], [195, 262], [262, 295]), propulsao: 381, combustivel: 428, co2Etanol: 548, co2Gasolina: 573, etCidade: 596, etEstrada: 616, gasCidade: 638, gasEstrada: 660, mj: 685 },
  2020: { ranges: R([60, 120], [120, 200], [240, 302], [200, 240]), combustivel: 401, co2Etanol: 532, co2Gasolina: 561, etCidade: 589, etEstrada: 611, gasCidade: 634, gasEstrada: 657 },
  2019: TABELA_2017_2019,
  2018: TABELA_2017_2019,
  2017: TABELA_2017_2019,
  2016: { ranges: R([60, 125], [125, 230], [262, 315], [230, 262]), combustivel: 411, co2Etanol: 539, co2Gasolina: 567, etCidade: 595, etEstrada: 616, gasCidade: 639, gasEstrada: 661 },
  2015: { ranges: R([60, 125], [125, 183], [212, 270], [183, 212]), combustivel: 377, co2Etanol: 518, co2Gasolina: 547, etCidade: 576, etEstrada: 601, gasCidade: 624, gasEstrada: 648 },
  2014: { ranges: R([60, 125], [125, 185], [215, 272], [185, 215]), combustivel: 379, co2Etanol: 519, co2Gasolina: 548, etCidade: 577, etEstrada: 601, gasCidade: 624, gasEstrada: 649 },
  2013: { ranges: R([60, 125], [125, 180], [212, 270], [180, 212]), combustivel: 379, co2Etanol: 521, co2Gasolina: 549, etCidade: 578, etEstrada: 603, gasCidade: 626, gasEstrada: 651 },
  2012: { rotated: true, rowGap: 4, ranges: R([20, 85], [85, 160], [160, 262], [262, 330]), combustivel: 560, etCidade: 608, gasCidade: 648, etEstrada: 693, gasEstrada: 733 },
  2011: { rotated: true, rowGap: 4, ranges: R([20, 85], [85, 160], [160, 262], [262, 330]), combustivel: 560, etCidade: 609, gasCidade: 651, etEstrada: 694, gasEstrada: 734 },
  2010: { rotated: true, rowGap: 4, ranges: R([20, 100], [100, 160], [160, 245], [245, 320]), combustivel: 541, etCidade: 589, gasCidade: 631, etEstrada: 674, gasEstrada: 714 },
};

const TOLERANCE = 12;

const toNumber = (s) => {
  const n = Number(String(s ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function combined(city, road) {
  if (!city || !road) return null;
  return Math.round((1 / (0.55 / city + 0.45 / road)) * 10) / 10;
}

function pick(tokens, x) {
  if (x === undefined) return null;
  let best = null;
  let dist = TOLERANCE;
  for (const [tx, text] of tokens) {
    const d = Math.abs(tx - x);
    if (d <= dist) { best = text; dist = d; }
  }
  return best;
}

function column(tokens, layout, name) {
  if (!layout.ranges) return pick(tokens, layout[name]);
  const [from, to] = layout.ranges[name];
  return tokens.filter(([x]) => x >= from && x < to).map((t) => t[1]).join(' ').trim() || null;
}

const BRAND_ALIASES = { VW: 'VOLKSWAGEN', 'V W': 'VOLKSWAGEN', 'GREAT WALL': 'GWM', CAOACHANGAN: 'CAOA CHANGAN', 'MERCEDES BENZ': 'MERCEDES-BENZ' };
const cleanBrand = (s) => {
  const up = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  return BRAND_ALIASES[up] ?? up;
};

const cleanModel = (s) => s.replace(/\s*\*+\s*$/, '').replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase();
const cleanText = (s) => { const t = (s ?? '').trim(); return t === '-' || t === '\\' ? '' : t; };
const sane = (km, max) => km === null || (km >= 3 && km <= max);

export function parseRow(tokens, cycle) {
  const c = LAYOUTS[cycle];
  const fuel = pick(tokens, c.combustivel);
  if (!['F', 'G', 'E', 'D'].includes(fuel)) return null;
  const marca = column(tokens, c, 'marca');
  const modelo = column(tokens, c, 'modelo');
  if (!marca || !modelo || /^marca$/i.test(marca)) return null;
  const propulsao = pick(tokens, c.propulsao) ?? '';
  const versao = cleanText(column(tokens, c, 'versao'));
  const base = [cleanBrand(marca), cleanModel(modelo)];

  if (/el[ée]tric/i.test(propulsao)) {
    const mj = toNumber(pick(tokens, c.mj));
    if (!mj) return null;
    return [...base, versao, '', 'V', cycle, null, null, null, null, Math.round((mj / 3.6) * 1000) / 1000];
  }

  if (/plug/i.test(propulsao) && cycle <= 2022) return null;

  const et = combined(toNumber(pick(tokens, c.etCidade)), toNumber(pick(tokens, c.etEstrada)));
  const gas = combined(toNumber(pick(tokens, c.gasCidade)), toNumber(pick(tokens, c.gasEstrada)));
  if ((!et && !gas) || (fuel === 'E' && !et) || !sane(et, 30) || !sane(gas, 40)) return null;
  const co2 = (x) => {
    const v = pick(tokens, x);
    return v === '0' ? 0 : toNumber(v);
  };

  const nome = /plug/i.test(propulsao) ? `${versao} (plug-in)`.trim() : versao;
  return [...base, nome, cleanText(column(tokens, c, 'motor')), fuel, cycle, et, gas, et ? co2(c.co2Etanol) : null, gas ? co2(c.co2Gasolina) : null];
}

export function groupRows(items, { rotated = false, rowGap = 1 } = {}) {
  const tokens = items
    .filter((it) => it.str?.trim())
    .map((it) => (rotated
      ? { line: it.transform[4], x: Math.round(it.transform[5]), text: it.str.trim() }
      : { line: -it.transform[5], x: Math.round(it.transform[4]), text: it.str.trim() }))
    .sort((a, b) => a.line - b.line);
  const rows = [];
  let top = null;
  for (const t of tokens) {
    if (top === null || t.line - top > rowGap) { rows.push([]); top = t.line; }
    rows[rows.length - 1].push([t.x, t.text]);
  }
  return rows.map((row) => row.sort((a, b) => a[0] - b[0]));
}

export function dedupe(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = r.join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
