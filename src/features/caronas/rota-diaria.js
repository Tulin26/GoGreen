import { store } from '../../dados/index.js';
import { session } from '../../shared/estado.js';
import { esc } from '../../shared/formato.js';
import { $, $$ } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { confirmar } from '../../shared/ui/confirmar.js';
import { toast } from '../../shared/ui/toast.js';
import { openCarForm } from '../carros/formulario.js';
import { removeVehicle } from '../carros/remover.js';
import { requireLogin } from '../conta/login.js';
import { createBusca } from '../rotas/busca.js';
import { buscaHtml } from '../rotas/busca-html.js';
import { acceptTerms } from './dialogos.js';
import { formatDays } from './regras.js';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const rideVehicleLabel = (c) => `${c.tipo === 'moto' ? 'Moto' : 'Carro'} ${c.marca} ${c.modelo} ${c.ano}`;

const bloco = (n, titulo, dica, corpo) => `<section class="bloco"><h3 class="bloco__titulo"><span class="bloco__num" aria-hidden="true">${n}</span>${titulo}</h3>${dica ? `<p class="bloco__dica">${dica}</p>` : ''}${corpo}</section>`;

const papelCard = (valor, titulo, texto, marcado) => `<label class="papel"><input type="radio" name="papel" value="${valor}"${marcado ? ' checked' : ''} data-papel><span class="papel__corpo"><strong>${titulo}</strong><span>${texto}</span></span></label>`;

const formHtml = () => `<div class="rota-form">
  ${bloco(1, 'Trajeto', 'Use um ponto de encontro e evite o endereço exato da sua casa: origem e destino aparecem para quem procura carona.', buscaHtml())}
  ${bloco(2, 'Quando', '', `<div class="trajeto__quando">
      <label class="rs-field-label" for="c-ida">Saio às</label><input class="form-control" id="c-ida" type="time" value="07:00">
      <label class="rs-field-label" for="c-volta">Volto às (opcional)</label><input class="form-control" id="c-volta" type="time">
    </div>
    <fieldset class="trajeto__dias"><legend class="rs-field-label">Dias da semana</legend>
      ${DIAS.map((d, i) => `<label class="opcao"><input type="checkbox" data-dia="${i}"${i >= 1 && i <= 5 ? ' checked' : ''}><span class="opcao__caixa">${icon('check')}</span>${d}</label>`).join('')}
    </fieldset>`)}
  ${bloco(3, 'Como você participa', '', `<fieldset class="papeis"><legend class="sr-only">Como você participa</legend>
      ${papelCard('passageiro', 'Preciso de carona', 'Procuro motoristas que passam pelo meu trajeto.', true)}
      ${papelCard('motorista', 'Ofereço carona', 'Tenho carro ou moto e posso levar alguém.', false)}
    </fieldset>
    <div data-oferta hidden>
      <div class="grade-campos">
        <div class="campo"><label class="campo__rotulo" for="c-carro">Veículo da carona</label><select class="form-select entrada select" id="c-carro" data-carro></select></div>
        <div class="campo"><label class="campo__rotulo" for="c-vagas">Vagas</label><input class="form-control entrada" id="c-vagas" type="number" min="1" max="6" value="3" inputmode="numeric"></div>
      </div>
      <button class="botao botao--texto" type="button" data-apagar-veiculo hidden>Apagar veículo, placa e rotas vinculadas</button>
    </div>`)}
  <p class="campo__erro" role="alert" data-erro-rota hidden></p>
  <button class="btn btn-success botao botao--primario botao--bloco" type="button" data-salvar-rota>Salvar minha rota</button>
</div>`;

const routeCard = (r) => `<li class="trajeto__cartao rota-item">
  <span class="selo selo--papel selo--papel-${r.papel}">${r.papel === 'motorista' ? 'Dou carona' : 'Preciso de carona'}</span>
  <h3 class="rota-item__trajeto">${esc(r.origem)} <span class="rota-item__seta" aria-hidden="true">→</span> ${esc(r.destino)}</h3>
  <p class="rota-item__quando">Saída ${esc(r.ida_hora)}${r.volta_hora ? ` · volta ${esc(r.volta_hora)}` : ''} · ${formatDays(r.dias)}</p>
  <div class="rota-item__acoes">${r.papel === 'passageiro' ? `<button class="btn btn-success botao botao--primario" type="button" data-ver-motoristas="${esc(r.id)}">Ver motoristas</button>` : ''}
    <button class="botao botao--texto" type="button" data-apagar="${esc(r.id)}">Apagar</button></div></li>`;

const vazio = '<div class="vazio"><p class="vazio__titulo">Você ainda não cadastrou nenhuma rota</p><p class="texto-2">Cadastre o caminho que faz todo dia para achar motoristas ou receber pedidos.</p><button class="btn btn-success botao botao--primario" type="button" data-ir-nova>Cadastrar minha rota</button></div>';

export function createRotaDiaria({ box, listBox, onRoutes, onPickRoute, onSaved = () => {}, onNew = () => {} }) {
  box.innerHTML = formHtml();
  const busca = createBusca(box, { onCompare: () => $('#c-ida', box).focus() });
  const err = $('[data-erro-rota]', box);
  const fail = (msg) => { err.textContent = msg; err.hidden = false; };
  let routes = [];

  async function fillCars() {
    const cars = session.user ? await store.listCars().catch(() => []) : [];
    const select = $('[data-carro]', box);
    select.innerHTML = cars.map((c) => `<option value="${esc(c.id)}" data-tipo="${c.tipo === 'moto' ? 'moto' : 'carro'}">${esc(rideVehicleLabel(c))}</option>`).join('');
    $('[data-apagar-veiculo]', box).hidden = cars.length === 0;
    const updateSeats = () => {
      const motorcycle = select.selectedOptions[0]?.dataset.tipo === 'moto';
      const seats = $('#c-vagas', box);
      seats.max = motorcycle ? '1' : '6';
      seats.value = motorcycle ? '1' : '3';
    };
    select.onchange = updateSeats;
    updateSeats();
    return cars;
  }

  async function reload() {
    routes = session.user ? await store.listDailyRoutes().catch(() => []) : [];
    listBox.innerHTML = routes.length ? `<ul class="lista-cartoes">${routes.map(routeCard).join('')}</ul>` : vazio;
    onRoutes(routes);
  }

  async function readPoints() {
    if (!busca.isFilled()) return null;
    try {
      const pending = await busca.resolve();
      if (pending?.noResults) { fail('Não encontramos esse lugar em Araçatuba. Confira o endereço.'); return null; }
      if (pending?.choose) { busca.offerChoice(pending.choose, pending.key); return null; }
    } catch { fail('Não foi possível buscar esse lugar agora. Tente de novo.'); return null; }
    if (!busca.hasBothPoints() || !busca.insideCity()) { fail('Origem e destino precisam ficar em Araçatuba.'); return null; }
    return { points: busca.points(), labels: busca.labels() };
  }

  async function removeRoute(id) {
    const rota = routes.find((r) => r.id === id);
    const aviso = rota?.papel === 'motorista' ? 'Os pedidos de carona feitos a esta rota também serão apagados.' : 'Os pedidos que você fez com esta rota também serão apagados.';
    if (!await confirmar({ titulo: 'Apagar esta rota?', texto: `${aviso} Isso não pode ser desfeito.`, confirmar: 'Apagar rota', voltar: 'Manter', perigo: true })) return;
    try { await store.deleteDailyRoute(id); toast('Rota apagada.'); await reload(); } catch (er) { toast(er.message || 'Não foi possível apagar.'); }
  }

  async function save() {
    err.hidden = true;
    const where = await readPoints();
    if (!where) return;
    const dias = $$('[data-dia]', box).filter((c) => c.checked).map((c) => Number(c.dataset.dia));
    if (!dias.length) return fail('Marque pelo menos um dia da semana.');
    const ida = $('#c-ida', box).value;
    if (!ida) return fail('Informe o horário de saída.');
    if (!await requireLogin('Entre para salvar a sua rota.')) return;
    const driving = $('[data-papel]:checked', box).value === 'motorista';
    let extra = {};
    if (driving) {
      const cars = await fillCars();
      if (!cars.length) { fail('Cadastre um carro ou uma moto para dar carona.'); openCarForm(fillCars); return; }
      const vehicle = cars.find((c) => c.id === $('[data-carro]', box).value);
      const vagas = Number($('#c-vagas', box).value);
      const maxVagas = vehicle?.tipo === 'moto' ? 1 : 6;
      if (!(vagas >= 1 && vagas <= maxVagas)) return fail(vehicle?.tipo === 'moto' ? 'A carona de moto permite uma vaga.' : 'Escolha de 1 a 6 vagas.');
      if (!await acceptTerms()) return;
      extra = { car_id: $('[data-carro]', box).value, vagas };
    }
    try {
      await store.saveDailyRoute({ origem: where.labels[0], destino: where.labels[1], from: where.points[0], to: where.points[1], ida_hora: ida, volta_hora: $('#c-volta', box).value || null, dias, oferece_carona: driving, ...extra });
      toast(driving ? 'Rota salva. Você já aparece para quem procura carona.' : 'Rota salva. Veja os motoristas abaixo.');
      await reload();
      onSaved(driving);
      if (!driving) onPickRoute(routes.at(-1));
    } catch (e) { fail(e.message || 'Não foi possível salvar a rota.'); }
  }

  $$('[data-papel]', box).forEach((r) => r.addEventListener('change', async () => {
    $('[data-oferta]', box).hidden = $('[data-papel]:checked', box).value !== 'motorista';
    if (!$('[data-oferta]', box).hidden && await requireLogin('Entre para dar carona.')) await fillCars();
  }));
  listBox.addEventListener('click', async (e) => {
    if (e.target.closest('[data-ir-nova]')) { onNew(); return; }
    const see = e.target.closest('[data-ver-motoristas]');
    if (see) { onPickRoute(routes.find((r) => r.id === see.dataset.verMotoristas)); return; }
    const del = e.target.closest('[data-apagar]');
    if (del) await removeRoute(del.dataset.apagar);
  });
  box.addEventListener('click', async (e) => {
    const remove = e.target.closest('[data-apagar-veiculo]');
    if (remove) {
      const id = $('[data-carro]', box).value;
      if (!id) return;
      try {
        if (await removeVehicle(id)) {
          toast('Veículo, placa e rotas diárias vinculadas apagados.');
          await fillCars();
          await reload();
        }
      } catch (er) { toast(er.message || 'Não foi possível apagar o veículo.'); }
      return;
    }
    if (e.target.closest('[data-salvar-rota]')) { save(); return; }
  });

  reload();
  return { reload, routes: () => routes };
}
