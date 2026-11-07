import { store } from '../../dados/index.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';

                                                                                 
export async function removeVehicle(id) {
  const routes = await store.listDailyRoutes().catch(() => []);
  const linked = routes.filter((route) => route.car_id === id).length;
  const routeNotice = linked
    ? `${linked === 1 ? 'A rota diária de carona vinculada' : `As ${linked} rotas diárias de carona vinculadas`} e os pedidos dessas rotas também serão apagados.`
    : 'Qualquer rota diária de carona vinculada a ele e os pedidos dessa rota também serão apagados.';
  const confirmed = await new Promise((resolve) => {
    const dialog = openDialog({
      className: 'dialogo--confirmacao',
      html: `<div class="dialogo__corpo">
        <div class="dialogo__cabeca"><h2 class="dialogo__titulo">Apagar veículo?</h2>${closeButton}</div>
        <p>O veículo e a placa registrada serão apagados. ${routeNotice} Esta ação não pode ser desfeita.</p>
        <div class="dialogo__acoes">
          <button class="btn btn-outline-success botao botao--secundario" type="button" data-fechar>Manter veículo</button>
          <button class="btn btn-danger botao botao--primario" type="button" data-confirmar-apagamento>Apagar veículo</button>
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
  await store.deleteCar(id);
  return true;
}
