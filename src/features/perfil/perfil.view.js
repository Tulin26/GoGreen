import { deleteAccount } from './apagar-conta.js';
import { CAR_FUELS } from '../../config/combustiveis.js';
import { EXAMPLE_CAR } from '../../config/exemplos.js';
import { isDemo, store } from '../../dados/index.js';
import { onChange, session, setUser } from '../../shared/estado.js';
import { esc } from '../../shared/formato.js';
import { $, estado } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { readTransportes, transportesHtml } from '../../shared/ui/transportes.js';
import { prefs } from '../../shared/preferencias.js';
import { toast } from '../../shared/ui/toast.js';
import { isValidPhone, isValidUsername, normalizePhone } from '../../shared/validacao.js';
import { openCarForm } from '../carros/formulario.js';
import { removeVehicle } from '../carros/remover.js';
import { openAuth } from '../conta/login.js';

const consumption = (car) => {
  const f = (v) => String(Number(v)).replace('.', ',');
  const parts = [];
  if (car.km_l_gasolina) parts.push(`${f(car.km_l_gasolina)} km/l com gasolina`);
  if (car.km_l_etanol) parts.push(`${f(car.km_l_etanol)} km/l com etanol`);
  if (car.km_l_diesel) parts.push(`${f(car.km_l_diesel)} km/l com diesel`);
  if (car.kwh_km) parts.push(`${f(Math.round(car.kwh_km * 1000) / 10)} kWh a cada 100 km`);
  return parts.join(', ');
};

const carCard = (car) => {
  const moto = car.tipo === 'moto';
  return `<li class="card shadow-sm cartao">
  <h3 class="cartao__titulo">${esc(car.marca)} ${esc(car.modelo)} ${esc(car.ano)}${car.isExample ? ' <span class="tag-exemplo">EXEMPLO</span>' : ''}</h3>
  <p class="texto-peq texto-2">${moto ? 'Moto' : `${esc(car.versao ?? '')} ${CAR_FUELS[car.combustivel] ?? ''}`}. Placa ${esc(car.placa)}.</p>
  ${moto ? '' : `<p class="texto-peq">${consumption(car)}. <span class="texto-2">${car.origem_consumo === 'inmetro' ? 'Fonte: Inmetro.' : 'Informado por você.'}</span></p>`}
  ${car.isExample ? '' : `<div class="cartao__acoes"><button class="btn btn-link botao botao--texto" type="button" data-apagar-carro="${esc(car.id)}">Apagar veículo e rotas</button></div>`}
</li>`;
};

export function renderPerfil(root) {
  let alive = true;
  root.innerHTML = '<div class="tela"><div class="tela__conteudo tela__conteudo--estreito" data-corpo><h1 class="tela__titulo foco-titulo" tabindex="-1">Seu perfil</h1><div class="esqueleto"></div></div></div>';
  const body = $('[data-corpo]', root);

  async function paint() {
    const user = session.user;
    if (!user) {
      body.innerHTML = `<h1 class="tela__titulo foco-titulo" tabindex="-1">Seu perfil</h1>
        ${estado({ ic: 'carro', titulo: 'Entre para cadastrar seus carros', texto: 'Com o consumo do seu carro, a comparação mostra o gasto real. Também é assim que você oferece ou pede carona.', acao: '<button class="btn btn-success botao botao--primario" type="button" data-entrar>Entrar ou criar conta</button>' })}`;
      return;
    }
    let cars = [];
    let failed = false;
    try { cars = await store.listCars(); } catch { failed = true; }
    if (!alive) return;
    body.innerHTML = `<h1 class="tela__titulo foco-titulo" tabindex="-1">Seu perfil</h1>
      <section class="pilha"><div class="linha linha--entre"><h2 class="secao-titulo">Seus veículos</h2></div>
        ${failed ? '<p class="campo__erro" role="alert">Não foi possível carregar seus veículos.</p>' : ''}
        ${cars.length ? `<ul class="lista-cartoes">${cars.map(carCard).join('')}</ul>` : `<p class="texto-2">Nenhum veículo ainda. Cadastre carros para comparar o consumo e carros ou motos para oferecer carona.</p><ul class="lista-cartoes">${carCard(EXAMPLE_CAR)}</ul>`}
        <button class="btn btn-success botao botao--primario botao--bloco" type="button" data-novo-carro>${icon('mais')}Adicionar veículo</button></section>
      <form class="conta" data-perfil novalidate><h2 class="secao-titulo">Sua conta</h2>
        <div class="campo"><label class="campo__rotulo" for="p-apelido">Apelido</label><input class="form-control entrada" id="p-apelido" maxlength="40" value="${esc(user.apelido)}"></div>
        ${transportesHtml(user.transportes ?? [])}
        <div class="campo"><label class="campo__rotulo" for="p-usuario">Usuário</label><input class="form-control entrada" id="p-usuario" maxlength="30" autocapitalize="none" spellcheck="false" value="${esc(user.usuario ?? '')}" placeholder="Ex.: joao.silva"><p class="campo__ajuda">Para entrar sem digitar o e-mail. Letras minúsculas, números, ponto ou _.</p></div>
        <div class="campo"><label class="campo__rotulo" for="p-telefone">WhatsApp</label><input class="form-control entrada" id="p-telefone" type="tel" inputmode="tel" maxlength="20" value="${esc(user.telefone ?? '')}" placeholder="Ex.: 18 99999-0000"><p class="campo__ajuda">Necessário para caronas. Só aparece para quem combinar uma carona com você.</p></div>
        <div class="dialogo__acoes"><button class="btn btn-success botao botao--primario" type="submit">Salvar</button><button class="btn btn-outline-success botao botao--secundario" type="button" data-sair>Sair</button></div></form>
      <details class="preferencias"><summary class="preferencias__summary"><strong>Privacidade</strong><span>O que guardamos e como apagar</span></summary>
        <p class="texto-2 texto-peq">Guardamos seu apelido, e-mail, WhatsApp, veículos e placas, suas rotas diárias (origem, destino e horários), pedidos de carona e conversas. O WhatsApp e a placa só aparecem para a outra pessoa depois que o pedido é aceito. Seus dados não são vendidos nem usados para anúncios. Você pode apagar tudo quando quiser.</p>
        <button class="btn btn-link botao botao--texto" type="button" data-apagar-conta>Apagar minha conta e todos os meus dados</button></details>
      ${isDemo ? '<button class="btn btn-link botao botao--texto botao--voltar" type="button" data-limpar>Apagar os dados de demonstração deste navegador</button>' : ''}`;
  }

  root.onclick = async (e) => {
    const t = e.target;
    if (t.closest('[data-entrar]')) await openAuth();
    if (t.closest('[data-novo-carro]')) openCarForm(paint);
    const del = t.closest('[data-apagar-carro]');
    if (del) {
      try { if (await removeVehicle(del.dataset.apagarCarro)) { toast('Veículo, placa e rotas diárias vinculadas apagados.'); paint(); } } catch (err) { toast(err.message, { type: 'erro' }); }
    }
    if (t.closest('[data-apagar-conta]')) {
      try { if (await deleteAccount()) { setUser(null); toast('Conta e dados apagados.'); } } catch (err) { toast(err.message, { type: 'erro' }); }
    }
    if (t.closest('[data-sair]')) { await store.signOut(); setUser(null); }
    if (t.closest('[data-limpar]')) { await store.reset(); setUser(null); toast('Dados de demonstração recomeçados.'); }
  };
  root.onsubmit = async (e) => {
    if (!e.target.matches('[data-perfil]')) return;
    e.preventDefault();
    const telefone = normalizePhone($('#p-telefone', root).value);
    const usuario = $('#p-usuario', root).value.trim().toLowerCase();
    if (usuario && !isValidUsername(usuario)) { toast('O usuário precisa ter de 3 a 30 letras minúsculas, números, ponto ou _.', { type: 'erro' }); return; }
    if (telefone && !isValidPhone(telefone)) { toast('Confira o WhatsApp, com DDD.', { type: 'erro' }); return; }
    try {
      await store.updateProfile({ apelido: $('#p-apelido', root).value.trim() || 'Morador', usuario: usuario || null, telefone: telefone || null, transportes: readTransportes(root) });
      prefs.clearTransportes();
      setUser(await store.getUser());
      toast('Conta atualizada.');
    } catch (err) {
      toast(err.message, { type: 'erro' });
    }
  };
  const off = onChange((what) => { if (what === 'user') paint(); });
  paint();
  return () => { alive = false; off(); root.onclick = null; root.onsubmit = null; };
}
