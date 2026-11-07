import { CITY } from '../../config/cidade.js';
import { PLACES } from '../../config/lugares.js';
import { searchPlaces, suggestPlaces } from '../../servicos/enderecos.js';
import { loadRuas, searchLocal } from '../../servicos/enderecos-locais.js';
import { pickPointOnMap } from '../../shared/mapa/dialogos.js';
import { inBounds } from '../../shared/mapa/geometria.js';
import { describePositionError, getBestPosition } from '../../shared/mapa/posicao.js';
import { $ } from '../../shared/ui/dom.js';
import { icon } from '../../shared/ui/icones.js';
import { findLocalPlaces } from './lugares.js';
import { choiceHtml, startHtml } from './sugestoes.js';

                                                                         
const form = { from: { text: '', point: null }, to: { text: '', point: null } };

                                                                                        
export function createBusca(root, { onCompare, onLocate = () => {} }) {
  const inputs = { from: $('#r-de', root), to: $('#r-para', root) };
  const sugg = $('[data-sugestoes]', root);
  const err = $('[data-erro]', root);

  inputs.from.value = form.from.text;
  inputs.to.value = form.to.text;

  const showError = (msg) => { err.innerHTML = `${icon('alerta')}<span>${msg}</span>`; err.hidden = false; };
  const clearError = () => { err.hidden = true; };
  const clearSuggestions = () => { sugg.innerHTML = ''; };

  function setField(key, point, text) {
    form[key] = { point, text };
    inputs[key].value = text;
  }

  async function resolveField(key, signal) {
    const f = form[key];
    const text = inputs[key].value.trim();
    if (f.point && text === f.text) return f;
    f.point = null;
    f.text = text;
    if (!text) return null;
    const local = findLocalPlaces(text);
    if (local.length === 1) {
      setField(key, local[0].point, local[0].title);
      return form[key];
    }
                                                                                          
    const addr = searchLocal(text, await loadRuas());
    const exact = addr.find((a) => a.exact);
    if (exact && !local.length) {
      setField(key, exact.point, exact.title);
      return form[key];
    }
    if (!navigator.onLine && !addr.length) throw new Error('sem-rede');
    const items = [...local, ...addr, ...(navigator.onLine ? await searchPlaces(text, { signal }) : [])];
    if (!items.length) return { noResults: true, key };
    if (items.length === 1) {
      setField(key, items[0].point, items[0].title);
      return form[key];
    }
    return { choose: items, key };
  }

                                                                                                              
  function offerChoice(items, key, { fill = false } = {}) {
    sugg.innerHTML = choiceHtml(items, key, fill);
    sugg.onclick = async (e) => {
      const b = e.target.closest('[data-escolha]');
      if (!b) return;
      const it = items[Number(b.dataset.escolha)];
                                                                                 
      let point = it.point;
      try { point ??= await it.resolve(); } catch { showError('Não foi possível abrir esse lugar agora. Escolha outro ou marque no mapa.'); return; }
      setField(key, point, it.title);
      clearSuggestions();
      sugg.onclick = null;
      if (!fill) onCompare();
    };
  }

                                                                                                                      
  let typingTimer = null;
  let typingCtl = null;
  function suggestWhileTyping(key) {
    clearTimeout(typingTimer);
    typingCtl?.abort();
    const q = inputs[key].value.trim();
    if (q.length < 3) return;
    typingTimer = setTimeout(async () => {
      typingCtl = new AbortController();
      try {
        const seen = new Set();
        const [ruas, remote] = await Promise.all([loadRuas(), navigator.onLine ? suggestPlaces(q, { signal: typingCtl.signal }) : []]);
                                                                                             
        const items = [...findLocalPlaces(q).slice(0, 2), ...searchLocal(q, ruas).slice(0, 3), ...remote]
          .filter((it) => !seen.has(`${it.title}|${it.subtitle}`) && seen.add(`${it.title}|${it.subtitle}`)).slice(0, 7);
        if (items.length && inputs[key].value.trim() === q) offerChoice(items, key, { fill: true });
      } catch {                                                           }
    }, 400);
  }

  async function usePick(key) {
    const point = await pickPointOnMap({ title: key === 'from' ? 'Escolha a origem' : 'Escolha o destino' });
    if (!point) return;
    setField(key, point, key === 'from' ? 'Ponto no mapa (origem)' : 'Ponto no mapa (destino)');
    clearSuggestions();
  }

  const fmtAccuracy = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);

  async function useGps() {
    showError('Procurando o melhor sinal do GPS… (pode levar até 12 segundos)');
    try {
      const fix = await getBestPosition();
      const p = fix.point;
      onLocate(fix);                                                                        
      if (!inBounds(p, CITY.bounds)) {
        showError(`Sua localização (±${fmtAccuracy(fix.accuracy)}) está fora de Araçatuba. Digite um endereço na cidade.`);
        return;
      }
      setField('from', p, 'Minha localização');
      clearSuggestions();
      if (fix.accuracy > 500) {
        showError(`<strong>Localização aproximada (±${fmtAccuracy(fix.accuracy)}).</strong> Computadores sem GPS estimam pelo Wi‑Fi ou pelo IP. Se o ponto no mapa não for o seu, use "Escolher no mapa" na lista da origem.`);
      } else clearError();
    } catch (e) {
      showError(`<strong>Não conseguimos sua localização.</strong> ${describePositionError(e)}`);
    }
  }
                                                                                   
  root.querySelectorAll('[data-gps-botao]').forEach((b) => b.addEventListener('click', useGps));

  sugg.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-no-mapa]');
    if (pick) { usePick(pick.dataset.noMapa); return; }
    const place = e.target.closest('[data-lugar]');
    if (place) {
      const p = PLACES[Number(place.dataset.lugar)];
      setField(place.dataset.campoAlvo, p.point, p.title);
      clearSuggestions();
      clearError();
      return;
    }
    if (e.target.closest('[data-gps]')) useGps();
  });

  inputs.from.addEventListener('input', () => suggestWhileTyping('from'));
  inputs.to.addEventListener('input', () => suggestWhileTyping('to'));
  inputs.from.addEventListener('focus', () => { if (!inputs.from.value) sugg.innerHTML = startHtml('from'); });
  inputs.to.addEventListener('focus', () => { if (!inputs.to.value) sugg.innerHTML = startHtml('to'); });
  inputs.from.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inputs.to.focus(); } });
  inputs.to.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onCompare(); } });
  $('form.busca', root).addEventListener('submit', (e) => { e.preventDefault(); onCompare(); });
  $('[data-trocar]', root).onclick = () => {
    form.from.text = inputs.from.value;
    form.to.text = inputs.to.value;
    [form.from, form.to] = [form.to, form.from];
    inputs.from.value = form.from.text;
    inputs.to.value = form.to.text;
  };

  return {
    clearError,
    clearSuggestions,
    offerChoice,
                                                                        
    fillExample() {
      const [terminal, praca] = [PLACES[1], PLACES[2]];
      setField('from', terminal.point, terminal.title);
      setField('to', praca.point, praca.title);
    },
    usePick,
                                                
    isFilled() {
      if (!inputs.from.value.trim()) { showError('Digite de onde você sai.'); inputs.from.focus(); return false; }
      if (!inputs.to.value.trim()) { showError('Digite para onde você vai.'); inputs.to.focus(); return false; }
      return true;
    },
                                                                                       
    async resolve(signal) {
      for (const key of ['from', 'to']) {
        const r = await resolveField(key, signal);
        if (r?.noResults || r?.choose) return r;
      }
      return null;
    },
    insideCity: () => inBounds(form.from.point, CITY.bounds) && inBounds(form.to.point, CITY.bounds),
    hasPoint: (key) => Boolean(form[key].point),
    hasBothPoints: () => Boolean(form.from.point && form.to.point),
    points: () => [form.from.point, form.to.point],
    labels: () => [form.from.text, form.to.text],
    saveTexts() {
      form.from.text = inputs.from.value;
      form.to.text = inputs.to.value;
    },
  };
}
