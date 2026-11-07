                                                                                              
                                                                                            
import { mkdirSync, writeFileSync } from 'node:fs';
import { LAYOUTS, dedupe, groupRows, parseRow } from './pbev-parser.mjs';

const BASE = 'https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular';
const FILES = {
  2026: 'mascara-pbev-2026_19_jan-rev01.pdf',
  2025: 'mascara-pbev-2025-mar-11.pdf',
  2024: 'pbe-veicular-2024-1.pdf',
  2023: 'pbe-veicular-2023.pdf',
  2022: 'pbe-veicular-2022.pdf',
  2021: 'veiculos-leves-2021',
  2020: 'veiculos-leves-2020',
  2019: 'veiculos-leves-2019',
  2018: 'veiculos-leves-2018',
  2017: 'veiculos-leves-2017',
  2016: 'veiculos-leves-2016',
  2015: 'veiculos-leves-2015',
  2014: 'veiculos-leves-2014',
  2013: 'veiculos-leves-2013',
  2012: 'veiculos-leves-2012',
  2011: 'veiculos-leves-2011',
  2010: 'veiculos-leves-2010',
};

async function readTable(cycle, file, pdfjs) {
  const res = await fetch(`${BASE}/${file}/@@download/file`, { headers: { 'user-agent': 'GoGreen (projeto academico)' }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = new Uint8Array(await res.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
  const rows = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    for (const row of groupRows(items, LAYOUTS[cycle])) {
      const car = parseRow(row, cycle);
      if (car) rows.push(car);
    }
  }
  return rows;
}

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const all = [];
const summary = {};
for (const [cycle, file] of Object.entries(FILES)) {
  try {
    const rows = await readTable(Number(cycle), file, pdfjs);
    all.push(...rows);
    summary[cycle] = rows.length;
  } catch (err) {
    summary[cycle] = `falhou: ${err.message}`;
  }
}
const carros = dedupe(all);
mkdirSync('public/dados', { recursive: true });
writeFileSync('public/dados/consumo.json', JSON.stringify({
  fonte: 'Inmetro, Programa Brasileiro de Etiquetagem Veicular',
  gerado_em: new Date().toISOString(),
  colunas: ['marca', 'modelo', 'versao', 'motor', 'combustivel', 'ciclo', 'km_l_etanol', 'km_l_gasolina_ou_diesel', 'co2_fossil_g_km_etanol', 'co2_fossil_g_km_gasolina_ou_diesel', 'kwh_km'],
  resumo: summary,
  carros,
}));
console.log('Consumo do Inmetro:', JSON.stringify(summary), `${carros.length} carros`);
