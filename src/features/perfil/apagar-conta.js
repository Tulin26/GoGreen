import { store } from '../../dados/index.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';

/** Pede confirmação e apaga a conta com todos os dados dela. Devolve true se apagou. */
export async function deleteAccount() {
  const confirmed = await new Promise((resolve) => {
    const dialog = openDialog({
      className: 'dialogo--confirmacao',
      html: `<div class="dialogo__corpo">
        <div class="dialogo__cabeca"><h2 class="dialogo__titulo">Apagar minha conta?</h2>${closeButton}</div>
        <p>Seu perfil, telefone, veículos e placas, rotas diárias, pedidos de carona e conversas serão apagados. Esta ação não pode ser desfeita.</p>
        <div class="dialogo__acoes">
          <button class="btn btn-outline-success botao botao--secundario" type="button" data-fechar>Manter conta</button>
          <button class="btn btn-danger botao botao--primario" type="button" data-confirmar-apagamento>Apagar tudo</button>
        </div>
      </div>`,
    });
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirmar'), { once: true });
    dialog.querySelector('[data-confirmar-apagamento]').addEventListener('click', () => {
      dialog.returnValue = 'confirmar';
      dialog.close();
    });
  });
  if (!confirmed) return false;
  await store.deleteAccount();
  return true;
}
