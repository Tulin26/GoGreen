import { describePositionError, watchPosition } from '../../shared/mapa/posicao.js';
import { esc, fmtKm } from '../../shared/formato.js';
import { $ } from '../../shared/ui/dom.js';
import { toast } from '../../shared/ui/toast.js';
import { createGuide } from './guia.js';

const POOR_FIX_M = 80;

                                                                                                                                    
export function createGuiaUi({ root, mapa }) {
  const box = $('[data-guia]', root);
  let stopWatch = null;
  let wake = null;

  function end(message) {
    stopWatch?.();
    stopWatch = null;
    wake?.release?.().catch(() => {});
    wake = null;
    mapa.clearUser();
    box.hidden = true;
    box.innerHTML = '';
    if (message) toast(message);
  }

  const bar = (html) => {
    box.innerHTML = `<div class="guia__texto">${html}</div><button class="btn btn-outline-success botao botao--secundario" type="button" data-parar>Parar rota</button>`;
    box.hidden = false;
  };

                                                                     
  function start(legs) {
    end();
    const guide = createGuide(legs);
    bar('Procurando o sinal do GPS…');
    navigator.wakeLock?.request('screen').then((l) => { wake = l; }).catch(() => {});
    stopWatch = watchPosition((fix) => {
      const s = guide.update(fix);
      mapa.setUser(fix.point, fix.accuracy);
      if (s.arrived) { end('Você chegou ao destino.'); return; }
      const warn = s.off ? `<span class="guia__aviso">Você saiu da rota (a ${Math.round(s.offRouteM)} m do caminho). Volte ao traçado.</span>` : '';
      const poor = fix.accuracy > POOR_FIX_M ? `<span class="guia__aviso">GPS com pouca precisão (±${Math.round(fix.accuracy)} m).</span>` : '';
      bar(`<strong>Passo ${s.legIndex + 1} de ${legs.length}</strong> ${esc(s.step)}<br><span class="texto-2">Faltam ${fmtKm(s.distToLegEndM / 1000)} neste trecho.</span>${warn}${poor}`);
    }, (e) => {
      if (e?.code === 1 || e?.message === 'sem-gps') end(describePositionError(e));
      else bar(`Procurando o sinal do GPS… <span class="texto-2">${esc(describePositionError(e))}</span>`);
    });
  }

  box.addEventListener('click', (e) => { if (e.target.closest('[data-parar]')) end(); });
  return { start, stop: () => end(), destroy: () => end() };
}
