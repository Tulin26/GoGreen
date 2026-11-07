import { CAR_FUELS } from '../../config/combustiveis.js';
import { esc } from '../../shared/formato.js';
import { $ } from '../../shared/ui/dom.js';
import { brands, carFieldsFromEntry, isValidPlate, loadCatalog, modelsOf, normalizePlate, versionsOf } from './catalogo.js';

const FUEL_NAME = { F: 'flex', G: 'gasolina', E: 'etanol', D: 'diesel', V: 'elétrico' };
const versionKey = (e) => `${e.versao}|${e.motor}|${e.combustivel}`;
const comma = (n) => String(n).replace('.', ',');

                                                                
export function carFieldsHtml() {
  const year = new Date().getFullYear();
  return `<div class="grade-campos">
      <div class="campo"><label class="campo__rotulo" for="c-ano">Ano</label><input class="form-control entrada" id="c-ano" type="number" inputmode="numeric" min="1950" max="${year + 1}"></div>
      <div class="campo"><label class="campo__rotulo" for="c-placa">Placa</label><input class="form-control entrada" id="c-placa" maxlength="7" autocapitalize="characters" placeholder="ABC1D23"></div>
    </div>
    <p class="campo__ajuda">Só você vê a placa. Quem pega carona com você vê a placa depois que a vaga é aceita, para reconhecer o carro.</p>
    <div data-busca-inmetro class="pilha">
      <p class="texto-2 texto-peq" data-status-lista role="status">Carregando a lista do Inmetro…</p>
      <div class="campo"><label class="campo__rotulo" for="c-marca">Marca</label><select class="form-select entrada select" id="c-marca" disabled></select></div>
      <div class="campo"><label class="campo__rotulo" for="c-modelo">Modelo</label><select class="form-select entrada select" id="c-modelo" disabled></select></div>
      <div class="campo"><label class="campo__rotulo" for="c-versao">Versão</label><select class="form-select entrada select" id="c-versao" disabled></select></div>
    </div>
    <button class="btn btn-link botao botao--texto botao--voltar" type="button" data-manual>Meu carro não está na lista</button>
    <div data-campos-manuais class="pilha" hidden>
      <div class="grade-campos">
        <div class="campo"><label class="campo__rotulo" for="m-marca">Marca</label><input class="form-control entrada" id="m-marca" maxlength="40"></div>
        <div class="campo"><label class="campo__rotulo" for="m-modelo">Modelo</label><input class="form-control entrada" id="m-modelo" maxlength="60"></div>
        <div class="campo campo--inteiro"><label class="campo__rotulo" for="m-comb">Combustível</label><select class="form-select entrada select" id="m-comb">${Object.entries(CAR_FUELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="campo" data-km="gasolina"><label class="campo__rotulo" for="m-gas">km/l com gasolina</label><input class="form-control entrada" id="m-gas" inputmode="decimal"></div>
        <div class="campo" data-km="etanol"><label class="campo__rotulo" for="m-eta">km/l com etanol</label><input class="form-control entrada" id="m-eta" inputmode="decimal"></div>
        <div class="campo" data-km="diesel" hidden><label class="campo__rotulo" for="m-die">km/l com diesel</label><input class="form-control entrada" id="m-die" inputmode="decimal"></div>
        <div class="campo campo--inteiro" data-km="eletrico" hidden><label class="campo__rotulo" for="m-kwh">kWh a cada 100 km</label><input class="form-control entrada" id="m-kwh" inputmode="decimal"></div>
      </div>
      <p class="campo__ajuda">Use o que aparece no computador de bordo ou no manual do carro.</p>
    </div>
    <p class="texto-peq" data-resumo></p>`;
}

                                                                              
export function bindCarFields(box) {
  const year = new Date().getFullYear();
  const q = (s) => $(s, box);
  let catalog = [];
  let manual = false;
  const fill = (sel, items, label, valueOf = (x) => x, textOf = (x) => x) => {
    sel.innerHTML = `<option value="">${label}</option>${items.map((it) => `<option value="${esc(valueOf(it))}">${esc(textOf(it))}</option>`).join('')}`;
    sel.disabled = !items.length;
  };
  const setManual = (on) => {
    manual = on;
    q('[data-busca-inmetro]').hidden = on;
    q('[data-campos-manuais]').hidden = !on;
    q('[data-manual]').textContent = on ? 'Voltar para a lista do Inmetro' : 'Meu carro não está na lista';
  };
  const currentVersions = () => versionsOf(catalog, q('#c-marca').value, q('#c-modelo').value, q('#c-ano').value);
  const entry = () => currentVersions().find((e) => versionKey(e) === q('#c-versao').value) ?? null;

  function paintSummary() {
    const e = entry();
    if (!e) { q('[data-resumo]').textContent = ''; return; }
    const ano = Number(q('#c-ano').value);
    const far = ano && Math.abs(ano - e.ciclo) > 1 ? ` A tabela mais próxima do seu carro é a de ${e.ciclo}, então o consumo real pode ser outro.` : '';
    const parts = e.kwh ? [`${comma(Math.round(e.kwh * 1000) / 10)} kWh a cada 100 km`] : [
      e.km_g && `${comma(e.km_g)} km/l com ${e.combustivel === 'D' ? 'diesel' : 'gasolina'}`,
      e.km_e && `${comma(e.km_e)} km/l com etanol`,
    ].filter(Boolean);
    q('[data-resumo]').textContent = `Inmetro ${e.ciclo}: ${parts.join(', ')}.${far}`;
  }

  function fillVersions() {
                                                                                             
    const select = q('#c-versao');
    const chosen = select.value;
    fill(select, currentVersions(), 'Escolha a versão', versionKey, (e) => `${e.versao} ${e.motor} (${FUEL_NAME[e.combustivel]})`.replace(/\s+/g, ' ').trim());
    select.value = chosen;
    if (select.selectedIndex < 0) select.value = '';
    paintSummary();
  }

  loadCatalog().then((c) => {
    catalog = c;
    if (!c.length) {
      setManual(true);
      q('[data-status-lista]').textContent = '';
      q('[data-manual]').hidden = true;
      q('[data-resumo]').textContent = 'A lista do Inmetro não carregou. Preencha o consumo do seu carro.';
      return;
    }
    q('[data-status-lista]').textContent = 'Modelos de 2010 a 2026, das tabelas do Inmetro.';
    fill(q('#c-marca'), brands(c), 'Escolha a marca');
  });
  q('#c-marca').onchange = () => { fill(q('#c-modelo'), modelsOf(catalog, q('#c-marca').value), 'Escolha o modelo'); fill(q('#c-versao'), [], 'Escolha a versão'); paintSummary(); };
  q('#c-modelo').onchange = () => { q('#c-versao').value = ''; fillVersions(); };
  q('#c-ano').onchange = () => { if (!manual && q('#c-modelo').value) fillVersions(); };
  q('#c-versao').onchange = paintSummary;
  q('[data-manual]').onclick = () => setManual(!manual);
  const paintKm = () => {
    const v = q('#m-comb').value;
    box.querySelectorAll('[data-km]').forEach((el) => {
      const k = el.dataset.km;
      el.hidden = !(v === k || (v === 'flex' && (k === 'gasolina' || k === 'etanol')));
    });
  };
  q('#m-comb').onchange = paintKm;
  paintKm();
  const num = (s) => { const n = Number(q(s).value.replace(',', '.')); return n > 0 ? n : null; };

  function readManual() {
    const combustivel = q('#m-comb').value;
    const car = { marca: q('#m-marca').value.trim().toUpperCase(), modelo: q('#m-modelo').value.trim().toUpperCase(), versao: null, combustivel, origem_consumo: 'manual' };
    if (!car.marca || !car.modelo) return { error: 'Informe a marca e o modelo.' };
    if (combustivel === 'eletrico') {
      const kwh100 = num('#m-kwh');
      if (!(kwh100 >= 2 && kwh100 <= 100)) return { error: 'Informe o consumo em kWh a cada 100 km.' };
      return { car: { ...car, kwh_km: kwh100 / 100 } };
    }
    const km = { gasolina: num('#m-gas'), etanol: num('#m-eta'), diesel: num('#m-die') };
    const need = combustivel === 'flex' ? ['gasolina', 'etanol'] : [combustivel];
    if (need.some((k) => !(km[k] >= 1 && km[k] <= 80))) return { error: 'Informe o consumo em km por litro.' };
    for (const k of need) car[`km_l_${k}`] = km[k];
    return { car };
  }

  return {
    read() {
      const ano = Number(q('#c-ano').value);
      const placa = normalizePlate(q('#c-placa').value);
      if (!(ano >= 1950 && ano <= year + 1)) return { error: 'Informe o ano do carro.' };
      if (!isValidPlate(placa)) return { error: 'Confira a placa. Exemplos: ABC1D23 ou ABC1234.' };
      let result;
      if (manual) {
        result = readManual();
      } else {
        const en = entry();
        if (!en) return { error: 'Escolha marca, modelo e versão, ou informe o carro à mão.' };
        result = { car: { marca: en.marca, modelo: en.modelo, ...carFieldsFromEntry(en) } };
      }
      return result.error ? result : { car: { ...result.car, ano, placa } };
    },
  };
}
