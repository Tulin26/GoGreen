import { session } from '../../shared/estado.js';
import { $ } from '../../shared/ui/dom.js';
import { createCandidatos } from '../rotas/candidatos.js';
import { createPedidos } from './solicitacoes.js';
import { createRotaDiaria } from './rota-diaria.js';

   
                                                                                                                      
                                                    
   
export function renderCaronas(root) {
  root.innerHTML = `<div class="tela"><div class="tela__conteudo tela__conteudo--estreito">
    <h1 class="tela__titulo foco-titulo" tabindex="-1">Caronas</h1>
    <p class="texto-2">Cadastre a rota que você faz todo dia. Quem tem carro ou moto recebe os pedidos e decide se compensa desviar um pouco; quem precisa de carona escolhe o motorista.</p>
    <section data-rota aria-label="Minha rota diária"></section>
    <section data-candidatos aria-label="Motoristas na minha rota"></section>
    <section data-pedidos aria-label="Pedidos de carona"></section></div></div>`;
  const pedidos = createPedidos({ box: $('[data-pedidos]', root) });
  const candidatos = createCandidatos({ box: $('[data-candidatos]', root), onRequested: () => pedidos.refresh() });
  createRotaDiaria({
    box: $('[data-rota]', root),
    onRoutes: () => pedidos.refresh(),
    onPickRoute: (route) => { if (route) candidatos.show(route); },
  });
  if (session.user) pedidos.refresh();
}
