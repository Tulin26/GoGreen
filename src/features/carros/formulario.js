import { store } from '../../dados/index.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { $ } from '../../shared/ui/dom.js';
import { esc } from '../../shared/formato.js';
import { toast } from '../../shared/ui/toast.js';
import { bindCarFields, carFieldsHtml } from './campos-carro.js';
import { isValidPlate, normalizePlate } from './catalogo.js';
import { MOTO_MODELS } from '../../config/motos.js';

const motoBrandOptions = Object.keys(MOTO_MODELS).map((brand) => `<option value="${esc(brand)}">${esc(brand)}</option>`).join('');

export function openCarForm(onSaved = () => {}) {
  const d = openDialog({
    html: `<form class="dialogo__corpo" novalidate>
      <div class="dialogo__cabeca"><h2 class="dialogo__titulo">Adicionar veículo</h2>${closeButton}</div>
      <div class="campo"><label class="campo__rotulo" for="v-tipo">Tipo de veículo</label><select class="form-select entrada select" id="v-tipo" data-tipo><option value="carro">Carro</option><option value="moto">Moto</option></select></div>
      <div data-campos-carro>${carFieldsHtml()}</div>
      <div class="pilha" data-campos-moto hidden>
        <div class="grade-campos">
          <div class="campo"><label class="campo__rotulo" for="mo-ano">Ano</label><input class="form-control entrada" id="mo-ano" type="number" inputmode="numeric" min="1950"></div>
          <div class="campo"><label class="campo__rotulo" for="mo-placa">Placa</label><input class="form-control entrada" id="mo-placa" maxlength="7" autocapitalize="characters" placeholder="ABC1D23"></div>
          <div class="campo"><label class="campo__rotulo" for="mo-marca">Marca</label><select class="form-select entrada select" id="mo-marca" data-moto-marca><option value="">Selecione a marca</option>${motoBrandOptions}<option value="__outra">Outra marca</option></select></div>
          <div class="campo" data-moto-outra-marca hidden><label class="campo__rotulo" for="mo-marca-custom">Outra marca</label><input class="form-control entrada" id="mo-marca-custom" maxlength="40"></div>
          <div class="campo" data-moto-select-modelo><label class="campo__rotulo" for="mo-modelo">Modelo</label><select class="form-select entrada select" id="mo-modelo" data-moto-modelo disabled><option value="">Selecione a marca primeiro</option></select></div>
          <div class="campo" data-moto-outro-modelo hidden><label class="campo__rotulo" for="mo-modelo-custom">Outro modelo</label><input class="form-control entrada" id="mo-modelo-custom" maxlength="60"></div>
        </div>
        <p class="campo__ajuda">Informe os dados da moto. A placa só aparece para quem pegar a carona depois que você aceitar o pedido.</p>
      </div>
      <p class="campo__erro" role="alert" hidden></p>
      <button class="btn btn-success botao botao--primario botao--bloco" type="submit" data-salvar>Salvar veículo</button>
    </form>`,
  });
  const fields = bindCarFields(d);
  const tipo = $('[data-tipo]', d);
  const motoBrand = $('[data-moto-marca]', d);
  const motoModel = $('[data-moto-modelo]', d);
  const fillMotoModels = () => {
    const otherBrand = motoBrand.value === '__outra';
    $('[data-moto-outra-marca]', d).hidden = !otherBrand;
    $('[data-moto-select-modelo]', d).hidden = otherBrand;
    const otherModel = $('[data-moto-outro-modelo]', d);
    if (otherBrand) {
      motoModel.innerHTML = '<option value="">Selecione a marca primeiro</option>';
      motoModel.disabled = true;
      otherModel.hidden = false;
      return;
    }
    const models = MOTO_MODELS[motoBrand.value] ?? [];
    motoModel.innerHTML = `<option value="">Selecione o modelo</option>${models.map((model) => `<option value="${esc(model)}">${esc(model)}</option>`).join('')}<option value="__outro">Outro modelo</option>`;
    motoModel.disabled = !models.length;
    otherModel.hidden = true;
  };
  const fillMotoCustomModel = () => {
    if (motoBrand.value !== '__outra') $('[data-moto-outro-modelo]', d).hidden = motoModel.value !== '__outro';
  };
  motoBrand.addEventListener('change', fillMotoModels);
  motoModel.addEventListener('change', fillMotoCustomModel);
  fillMotoModels();
  const paintType = () => {
    $('[data-campos-carro]', d).hidden = tipo.value !== 'carro';
    $('[data-campos-moto]', d).hidden = tipo.value !== 'moto';
  };
  tipo.addEventListener('change', paintType);
  $('form', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('.campo__erro', d);
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    let car;
    let error;
    if (tipo.value === 'moto') {
      const year = new Date().getFullYear();
      const ano = Number($('#mo-ano', d).value);
      const placa = normalizePlate($('#mo-placa', d).value);
      const marca = motoBrand.value === '__outra' ? $('#mo-marca-custom', d).value.trim() : motoBrand.value;
      const modelo = motoBrand.value === '__outra' || motoModel.value === '__outro' ? $('#mo-modelo-custom', d).value.trim() : motoModel.value;
      if (!(ano >= 1950 && ano <= year + 1)) error = 'Informe o ano da moto.';
      else if (!isValidPlate(placa)) error = 'Confira a placa. Exemplos: ABC1D23 ou ABC1234.';
      else if (!marca || !modelo) error = 'Informe a marca e o modelo da moto.';
      else car = { tipo: 'moto', marca, modelo, versao: null, ano, placa, combustivel: 'gasolina', origem_consumo: 'manual' };
    } else {
      ({ car, error } = fields.read());
      if (car) car.tipo = 'carro';
    }
    if (error) { fail(error); return; }
    const btn = $('[data-salvar]', d);
    btn.disabled = true;
    try {
      await store.addCar(car);
      d.close();
      toast(tipo.value === 'moto' ? 'Moto salva.' : 'Carro salvo. As rotas já usam o consumo dele.');
      onSaved();
    } catch (err2) {
      fail(/duplicate|unique/i.test(err2.message) ? 'Você já cadastrou um veículo com esta placa.' : err2.message);
    } finally {
      btn.disabled = false;
    }
  });
}
