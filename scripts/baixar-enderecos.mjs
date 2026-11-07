                                                                                                                 
                                                                                                                             
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { parseCnefe } from '../src/servicos/enderecos-locais.js';

const URL_ZIP = 'https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/35_SP/3502804_ARACATUBA.zip';
const OUT = 'public/dados/enderecos.json';

try {
  const res = await fetch(URL_ZIP, { headers: { 'user-agent': 'GoGreen (projeto academico)' }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const csv = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('.csv'));
  if (!csv) throw new Error('zip sem CSV');
  const ruas = parseCnefe(strFromU8(csv[1]));
  if (ruas.length < 100) throw new Error(`poucas ruas (${ruas.length})`);
  mkdirSync('public/dados', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ fonte: 'IBGE, CNEFE, Censo Demográfico 2022', gerado_em: new Date().toISOString(), ruas }));
  console.log(`Endereços do IBGE: ${ruas.length} ruas, ${ruas.reduce((n, r) => n + (r.h.length - 2) / 3, 0)} números`);
} catch (err) {
  console.log(`Endereços do IBGE: falhou (${err.message}); mantendo o arquivo anterior.`);
  if (!existsSync(OUT)) {
    mkdirSync('public/dados', { recursive: true });
    writeFileSync(OUT, JSON.stringify({ fonte: 'IBGE, CNEFE, Censo Demográfico 2022', gerado_em: null, ruas: [] }));
  }
}
