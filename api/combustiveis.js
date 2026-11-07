                                                                                
                                                                                                            
import { LIST_URL, latestFileUrl, parseWorkbook, periodFromUrl } from './_anp.js';

export default async function handler(req, res) {
  try {
    const headers = { 'user-agent': 'GoGreen (projeto academico)' };
    const html = await (await fetch(LIST_URL, { headers, signal: AbortSignal.timeout(15000) })).text();
    const url = latestFileUrl(html);
    if (!url) throw new Error('Planilha não encontrada na página da ANP');
    const file = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!file.ok) throw new Error(`Planilha: HTTP ${file.status}`);
    const { precos, postos } = parseWorkbook(new Uint8Array(await file.arrayBuffer()));
    if (!precos.gasolina || !precos.etanol) throw new Error('Preços de Araçatuba não encontrados');
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ municipio: 'Araçatuba', fonte: 'ANP', periodo: periodFromUrl(url), precos, postos, url });
  } catch (err) {
    res.setHeader('Cache-Control', 's-maxage=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ erro: err.message });
  }
}
