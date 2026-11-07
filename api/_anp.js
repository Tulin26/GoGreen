
import { strFromU8, unzipSync } from 'fflate';

export const LIST_URL = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas';

export function latestFileUrl(html) {
  const m = html.match(/https:\/\/[^"']*resumo_semanal_lpc[^"']*\.xlsx/i);
  return m ? m[0] : null;
}

export function periodFromUrl(url) {
  const m = url.match(/(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{4})[-_](\d{2})[-_](\d{2})\.xlsx/i);
  return m ? { inicio: `${m[1]}-${m[2]}-${m[3]}`, fim: `${m[4]}-${m[5]}-${m[6]}` } : null;
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

function sharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => decode([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
}

const colIndex = (ref) => {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};

function sheetRows(xml, strings) {
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(([, row]) => {
    const out = [];
    for (const [, attrs, inner] of row.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref || inner === undefined) continue;
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      if (v === undefined) continue;
      out[colIndex(ref)] = /t="s"/.test(attrs) ? strings[Number(v)] : decode(v);
    }
    return out;
  });
}

const PRODUCT = { 'GASOLINA COMUM': 'gasolina', 'ETANOL HIDRATADO': 'etanol', 'OLEO DIESEL S10': 'diesel' };

export function parseWorkbook(bytes, { municipio = 'ARACATUBA', estado = 'SAO PAULO' } = {}) {
  const files = unzipSync(bytes);
  const text = (name) => strFromU8(files[name]);
  const strings = files['xl/sharedStrings.xml'] ? sharedStrings(text('xl/sharedStrings.xml')) : [];
  const sheets = [...text('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  const rels = text('xl/_rels/workbook.xml.rels');
  const sheet = sheets.find(([, name]) => name === 'MUNICIPIOS');
  if (!sheet) throw new Error('Aba MUNICIPIOS não encontrada');
  const relTag = [...rels.matchAll(/<Relationship [^>]*>/g)].map((m) => m[0]).find((t) => t.includes(`Id="${sheet[2]}"`));
  const target = relTag.match(/Target="([^"]+)"/)[1].replace(/^\/?(xl\/)?/, '');
  const rows = sheetRows(text(`xl/${target}`), strings);
  const header = rows.find((r) => r.includes('MUNICÍPIO') && r.includes('PRODUTO'));
  if (!header) throw new Error('Cabeçalho não encontrado');
  const col = (name) => header.indexOf(name);
  const precos = {};
  const postos = {};
  for (const r of rows) {
    if (r[col('MUNICÍPIO')] !== municipio || r[col('ESTADO')] !== estado) continue;
    const key = PRODUCT[r[col('PRODUTO')]];
    if (!key) continue;
    precos[key] = Number(r[col('PREÇO MÉDIO REVENDA')]);
    postos[key] = Number(r[col('NÚMERO DE POSTOS PESQUISADOS')]);
  }
  return { precos, postos };
}
