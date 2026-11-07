import { isDemo, store } from '../../dados/index.js';
import { esc } from '../../shared/formato.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { $ } from '../../shared/ui/dom.js';

const POLL_MS = 5000;
const hhmm = (iso) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

const messagesHtml = (msgs) => (msgs.length
  ? msgs.map((m) => `<p class="chat__msg${m.mine ? ' chat__msg--minha' : ''}"><span class="chat__autor">${esc(m.mine ? 'Você' : m.autor)} · ${hhmm(m.created_at)}</span>${esc(m.body)}</p>`).join('')
  : '<p class="texto-2">Ninguém escreveu ainda. Combine o valor, o ponto de encontro e o horário.</p>');

   
                                                                                             
                                                                                                                
   
export async function openChat({ requestId, title }) {
  let timer = null;
  const d = openDialog({
    className: 'dialogo--chat',
    html: `<div class="dialogo__corpo"><div class="dialogo__cabeca"><h2 class="dialogo__titulo">${esc(title)}</h2>${closeButton}</div>
      <p class="aviso-dados"><span>Combinem preço e ponto de encontro aqui. O GoGreen não cobra nem processa pagamento.${isDemo ? ' <strong>Conversa de demonstração: o outro lado responde automaticamente.</strong>' : ''}</span></p>
      <div class="chat__lista" data-lista role="log" aria-live="polite"></div>
      <p class="campo__erro" role="alert" data-erro hidden></p>
      <form class="chat__form" novalidate><label class="sr-only" for="chat-texto">Mensagem</label>
        <input class="form-control entrada" id="chat-texto" maxlength="500" autocomplete="off" placeholder="Escreva sua mensagem">
        <button class="btn btn-success botao botao--primario" type="submit">Enviar</button></form></div>`,
    onClose: () => clearInterval(timer),
  });
  const list = $('[data-lista]', d);
  const err = $('[data-erro]', d);

  async function refresh() {
    try {
      const msgs = await store.listRequestMessages(requestId);
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      list.innerHTML = messagesHtml(msgs);
      if (atBottom) list.scrollTop = list.scrollHeight;
    } catch {                                           }
  }
  await refresh();
  list.scrollTop = list.scrollHeight;
  timer = setInterval(refresh, POLL_MS);

  $('form', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chat-texto', d);
    const body = input.value.trim();
    if (!body) { err.textContent = 'Escreva uma mensagem.'; err.hidden = false; return; }
    err.hidden = true;
    try {
      await store.sendRequestMessage(requestId, body);
      input.value = '';
      await refresh();
      list.scrollTop = list.scrollHeight;
    } catch (er) { err.textContent = er.message || 'Não foi possível enviar.'; err.hidden = false; }
  });
  $('#chat-texto', d).focus();
}
