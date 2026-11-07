import test from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { combined, dedupe, groupRows, parseRow } from '../../scripts/pbev-parser.mjs';
import { latestFileUrl, parseWorkbook, periodFromUrl } from '../../api/_anp.js';

const row = (s) => s.split('|').map((t) => { const i = t.lastIndexOf('@'); return [Number(t.slice(i + 1)), t.slice(0, i)]; });

test('consumo combinado do Inmetro', () => {
  assert.equal(combined(12.8, 15.5), 13.9);
  assert.equal(combined(null, 15), null);
});

test('tabela 2026: carro flex', () => {
  const r = parseRow(row('Médio@182|HONDA@215|CITY@247|LX@282|1.5-16V@302|Combustão@315|CVT@335|S@350|E@363|F@380|20@395|202@408|1@420|0@440|116@447|95@457|\\@467|9,3@475|10,4@485|9,8@498|12,8@509|15,5@519|13,9@531|1,53@592'), 2026);
  assert.deepEqual(r, ['HONDA', 'CITY', 'LX', '1.5-16V', 'F', 2026, 9.8, 13.9, 0, 95]);
});

test('tabela 2024: só gasolina', () => {
  const r = parseRow(row('Médio@42|MINI@90|Countryman@123|JCW@182|2.0 - 16V@225|Combustão@249|A-8@281|S@305|E@325|G@351|25@376|58@398|1@419|A@437|\\@456|141@473|\\@494|\\@512|\\@528|8.8@542|10.8@558|\\@581|\\@607|2.29@628'), 2024);
  assert.deepEqual(r.slice(0, 6), ['MINI', 'COUNTRYMAN', 'JCW', '2.0 - 16V', 'G', 2024]);
  assert.equal(r[6], null);
  assert.equal(r[7], combined(8.8, 10.8));
  assert.equal(r[9], 141);
});

test('tabela 2023: híbrido a gasolina', () => {
  const r = parseRow(row('Médio@60|KIA@107|STONIC@143|MHEV EX@195|1.0 - 12V@243|Híbrido@272|DCT-7@304|S@336|E@356|G@382|39@408|145@429|0@452|A@472|\\@490|95@506|\\@525|\\@542|\\@561|13,7@577|13,8@596'), 2023);
  assert.equal(r[0], 'KIA');
  assert.equal(r[4], 'G');
  assert.equal(r[7], combined(13.7, 13.8));
  assert.equal(r[9], 95);
});

test('tabela 2022: flex', () => {
  const r = parseRow(row('Utilitário Esportivo Compacto@38|CAOA CHERY@79|TIGGO 3X@113|ST TA@153|1.5 -16V@181|Combustão@199|CVT@226|S@247|E@264|F@284|63,900@301|508,800@318|0,754@336|C@355|0@370|118@381|7,3@396|8,4@410|10,6@423|12,2@437|1,94@456'), 2022);
  assert.deepEqual(r.slice(0, 2), ['CAOA CHERY', 'TIGGO 3X']);
  assert.equal(r[6], combined(7.3, 8.4));
  assert.equal(r[7], combined(10.6, 12.2));
  assert.equal(r[8], 0);
  assert.equal(r[9], 118);
});

test('tabela 2025: colunas de etanol e gasolina', () => {
  const r = parseRow(row('Sub Compacto@36|FIAT@93|MOBI@134|TREKKING@176|1.0-6V@215|Combustão@235|M-5@269|S@294|E@311|F@335|38@360|281@383|3@405|B@430|0@455|91@474|\\@495|9.8@512|10.6@528|14.0@545|15.1@562|\\@584|\\@609|1.46@632'), 2025);
  assert.deepEqual(r, ['FIAT', 'MOBI', 'TREKKING', '1.0-6V', 'F', 2025, combined(9.8, 10.6), combined(14, 15.1), 0, 91]);
});

test('padroniza nomes de marca e modelo', () => {
  const r = parseRow(row('Médio@44|CHEVROLET@87|ONIX (MY26)@129|LT@181|1.0 - 12V@212|Combustão@235|A-6@269|S@294|E@311|F@335|0@455|99@474|\\@495|9.8@512|10.6@528|14.0@545|15.1@562'), 2025);
  assert.equal(r[1], 'ONIX');
  const vw = parseRow(row('Médio@182|VW@217|POLO@247|-@279|1.0-12V@302|Combustão@315|M - 5@334|S@350|E@363|F@380|0@440|92@457|9,8@475|10,6@485|14,0@509|15,1@519'), 2026);
  assert.equal(vw[0], 'VOLKSWAGEN');
  const citroen = parseRow(row('CITROËN@97|C3@136|Live@186|1.2@249|F@380|0@513|98@540|9,3@566|10,1@590|13,2@614|13,7@639'), 2017);
  assert.equal(citroen[0], 'CITROEN');
  assert.equal(vw[2], '');
});

test('elétrico vira consumo em kWh por km', () => {
  const r = parseRow(row('Sub Compacto@36|BYD@90|DOLPHIN MINI@121|GS EV@180|Elétrico@226|Elétrico@252|N.A.@281|S@305|E@325|E@351|0@376|0@399|0@419|A@437|\\@456|0@475|\\@494|\\@512|\\@528|\\@544|\\@560|58.6@579|41.9@604|0.41@628|280@652'), 2024);
  assert.deepEqual(r, ['BYD', 'DOLPHIN MINI', 'GS EV', '', 'V', 2024, null, null, null, null, 0.114]);
});

test('plug-in usa o consumo no modo a combustão e fica identificado', () => {
  const r = parseRow(row('Médio@42|MINI@90|Countryman@123|PHEV@181|1.5 - 12V@225|Plug-in@252|A-6@281|S@305|E@325|G@351|10@376|128@397|1@419|A@437|\\@456|132@473|56@493|\\@512|\\@528|10.1@542|10.2@558|23.4@579|27.9@604|0.80@628'), 2024);
  assert.equal(r[2], 'PHEV (plug-in)');
  assert.equal(r[7], combined(10.1, 10.2));
  assert.equal(r[9], 132);
});

test('plug-in de 2022 fica de fora: o consumo mistura motor e bateria', () => {
  assert.equal(parseRow(row('Médio@51|MINI@84|Countryman@111|PHEV@154|1.5 - 12V@180|Plug-in@201|A-6@227|S@247|E-H@263|G@284|10,150@301|127,500@318|0,454@336|A@355|\\@370|59@382|\\@397|\\@411|23,3@423|27,0@437|0,80@456'), 2022), null);
});

test('tabela 2017: texto centralizado em faixas de coluna', () => {
  const r = parseRow(row('Sub Compacto@40|FIAT@97|Novo Uno@136|Sporting Dualogic@186|1.3 8V@249|MTA-5@281|S@317|H@344|F@380|0,019@405|0,508@426|0,032@446|B@480|0@513|98@540|9,3@566|10,1@590|13,2@614|13,7@639|1,57@667'), 2017);
  assert.deepEqual(r, ['FIAT', 'NOVO UNO', 'Sporting Dualogic', '1.3 8V', 'F', 2017, combined(9.3, 10.1), combined(13.2, 13.7), 0, 98]);
});

test('tabela 2014: motor em dois pedaços vira um só', () => {
  const r = parseRow(row('FIAT@88|500@149|1.4@190|16V@201|Sport Air@225|A@280|6@288|S@317|E@342|F@379|0,027@405|0,216@431|0,037@456|***@485|0@519|122@548|6,9@577|8,1@601|10,4@624|11,7@649|2,01@680'), 2014);
  assert.deepEqual(r.slice(0, 4), ['FIAT', '500', 'Sport Air', '1.4 16V']);
  assert.equal(r[9], 122);
});

test('tabela 2012: colunas intercaladas, sem CO2', () => {
  const r = parseRow(row('RENAULT@32|Clio@108|Expression 5 Portas@168|1.0 - 16V@270|M-5@346|N@414|M@481|F@560|9,5@608|14,3@648|10,7@690|15,8@733|A@790'), 2012);
  assert.deepEqual(r, ['RENAULT', 'CLIO', 'Expression 5 Portas', '1.0 - 16V', 'F', 2012, combined(9.5, 10.7), combined(14.3, 15.8), null, null]);
});

test('página deitada: a linha é a posição horizontal', () => {
  const it = (str, x, y) => ({ str, transform: [0, 4, -4, 0, x, y] });
  const rows = groupRows([it('Ford', 61.8, 102), it('Ka', 62.2, 162), it('Fiat', 68.9, 102)], { rotated: true, rowGap: 2 });
  assert.deepEqual(rows.map((r) => r.map((t) => t[1])), [['Ford', 'Ka'], ['Fiat']]);
});

test('elétrico sem dado, consumo impossível e cabeçalho ficam de fora', () => {
  assert.equal(parseRow(row('Médio@44|VOLVO@91|EX30@134|E60 ULTRA@175|ELÉTRICO@211|ELÉTRICO@236|E@335'), 2025), null);
  assert.equal(parseRow(row('Marca@91|Modelo@134|Versão@176'), 2025), null);
  assert.equal(parseRow(row('FIAT@97|Uno@136|Way@186|1.0@249|F@380|0@513|98@540|99@566|99@590|99@614|99@639'), 2017), null);
});

test('agrupa textos do PDF em linhas e tira repetidos', () => {
  const it = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y] });
                                                                             
  const rows = groupRows([it('B', 20, 463.4), it('A', 10, 463.6), it('C', 10, 460.3), it(' ', 5, 460.3)]);
  assert.deepEqual(rows[0].map((t) => t[1]), ['A', 'B']);
  assert.equal(rows[1].length, 1);
  assert.equal(dedupe([[1, 2], [1, 2], [3]]).length, 2);
});

function workbook() {
  const strings = ['DATA INICIAL', 'ESTADO', 'MUNICÍPIO', 'PRODUTO', 'NÚMERO DE POSTOS PESQUISADOS', 'PREÇO MÉDIO REVENDA', 'SAO PAULO', 'ARACATUBA', 'GASOLINA COMUM', 'ETANOL HIDRATADO', 'OLEO DIESEL S10', 'MARILIA', 'GNV'];
  const line = (n, cells) => `<row r="${n}">${cells.map(([c, v, s]) => `<c r="${c}${n}"${s ? ' t="s"' : ''}><v>${v}</v></c>`).join('')}</row>`;
  const data = (n, city, prod, postos, price) => line(n, [['A', 46000], ['B', 6, 1], ['C', city, 1], ['D', prod, 1], ['E', postos], ['F', price]]);
  const sheet = `<worksheet><sheetData>${line(1, [['A', 0, 1]])}${line(2, [['A', 0, 1], ['B', 1, 1], ['C', 2, 1], ['D', 3, 1], ['E', 4, 1], ['F', 5, 1]])}${data(3, 7, 8, 13, 6.3)}${data(4, 7, 9, 14, 3.59)}${data(5, 7, 10, 10, 7.32)}${data(6, 7, 12, 2, 4.5)}${data(7, 11, 8, 9, 9.99)}</sheetData></worksheet>`;
  return zipSync({
    'xl/workbook.xml': strToU8('<workbook xmlns:r="x"><sheets><sheet name="CAPA" sheetId="1" r:id="rId1"/><sheet name="MUNICIPIOS" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'),
    'xl/sharedStrings.xml': strToU8(`<sst>${strings.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`),
    'xl/worksheets/sheet2.xml': strToU8(sheet),
  });
}

test('planilha da ANP: lê só a cidade certa', () => {
  const { precos, postos } = parseWorkbook(workbook());
  assert.deepEqual(precos, { gasolina: 6.3, etanol: 3.59, diesel: 7.32 });
  assert.equal(postos.etanol, 14);
});

test('acha a planilha mais recente e o período', () => {
  const url = latestFileUrl('<a href="https://www.gov.br/anp/x/resumo_semanal_lpc_2026_10_18-2026_10_24.xlsx">a</a><a href="https://www.gov.br/anp/x/resumo_semanal_lpc_2026_10_11-2026_10_17.xlsx">b</a>');
  assert.ok(url.includes('10_18'));
  assert.deepEqual(periodFromUrl(url), { inicio: '2026-10-18', fim: '2026-10-24' });
  assert.deepEqual(periodFromUrl('resumo_semanal_lpc_2026-10-18_2026-10-24.xlsx'), { inicio: '2026-10-18', fim: '2026-10-24' });
});
