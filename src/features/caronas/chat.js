import { isDemo, store } from '../../dados/index.js';
import { esc } from '../../shared/formato.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { $ } from '../../shared/ui/dom.js';
import { messagesHtml } from './regras.js';

const POLL_MS = 5000;
export async function openChat({ requestId, title }) {
  let timer = null;
  const d = openDialog({
    className: 'dialogo--chat',
    html: `<div class="dialogo__corpo"><div class="dialogo__cabeca"><h2 class="dialogo__titulo">${esc(title)}</h2>${closeButton}</div>
      <p class="aviso-dados"><span>Combinem preço e ponto de encontro aqui. O GoGreen não cobra nem processa pagamento.${isDemo ? ' <strong>Conversa de demonstração: o outro lado responde automaticamente.</strong>' : ''}</span></p>
      <div class="chat__lista" data-lista role="log" aria-live="polite" aria-label="Mensagens"><p class="texto-2" role="status">Carregando a conversa…</p></div>
      <p class="chat__conexao" data-conexao role="status" hidden>Sem conexão. Tentando de novo…</p>
      <p class="campo__erro" role="alert" data-erro hidden></p>
      <form class="chat__form" novalidate><label class="sr-only" for="chat-texto">Mensagem</label>
        <input class="form-control entrada" id="chat-texto" maxlength="500" autocomplete="off" placeholder="Escreva sua mensagem">
        <button class="btn btn-success botao botao--primario" type="submit">Enviar</button></form></div>`,
    onClose: () => clearInterval(timer),
  });
  const list = $('[data-lista]', d);
  const err = $('[data-erro]', d);
  const offline = $('[data-conexao]', d);
  const input = $('#chat-texto', d);
  const send = $('button[type=submit]', d);

  async function refresh() {
    try {
      const msgs = await store.listRequestMessages(requestId);
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      list.innerHTML = messagesHtml(msgs);
      offline.hidden = true;
      if (atBottom) list.scrollTop = list.scrollHeight;
    } catch {
      offline.hidden = false;
      if (!list.querySelector('.chat__msg')) list.innerHTML = '';
    }
  }
  await refresh();
  list.scrollTop = list.scrollHeight;
  timer = setInterval(refresh, POLL_MS);

  $('form', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (send.disabled) return;
    const body = input.value.trim();
    if (!body) { err.textContent = 'Escreva uma mensagem.'; err.hidden = false; return; }
    err.hidden = true;
    send.disabled = true;
    send.textContent = 'Enviando…';
    try {
      await store.sendRequestMessage(requestId, body);
      input.value = '';
      await refresh();
      list.scrollTop = list.scrollHeight;
    } catch (er) { err.textContent = er.message || 'Não foi possível enviar. Tente de novo.'; err.hidden = false; }
    send.disabled = false;
    send.textContent = 'Enviar';
    input.focus();
  });
  input.focus();
}
