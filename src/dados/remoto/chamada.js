// Fala com o servidor (api/auth e api/db). O navegador guarda só um cookie de sessão HttpOnly; nunca vê chaves do banco.
const CABECALHOS = { 'content-type': 'application/json', 'x-gogreen': '1' };

async function enviar(fetchFn, url, corpo) {
  let resposta;
  try {
    resposta = await fetchFn(url, { method: 'POST', credentials: 'same-origin', headers: CABECALHOS, body: JSON.stringify(corpo) });
  } catch {
    return { data: null, error: { message: 'Sem conexão com o servidor. Confira sua internet.' } };
  }
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok) return { data: null, error: { message: json.erro ?? `Erro ${resposta.status} no servidor.` } };
  return { data: json, error: null };
}

/** Cliente do servidor. Todas as chamadas devolvem { data, error }, como o resto da camada de dados espera. */
export function criarCliente(fetchFn = (...a) => fetch(...a)) {
  const db = async (corpo) => {
    const { data, error } = await enviar(fetchFn, '/api/db', corpo);
    return { data: error ? null : data.dados, error };
  };
  return {
    rpc: (fn, args = {}) => db({ op: 'rpc', fn, args }),
    op: (op, args = {}) => db({ op, ...args }),
    auth: (acao, args = {}) => enviar(fetchFn, '/api/auth', { acao, ...args }),
  };
}
