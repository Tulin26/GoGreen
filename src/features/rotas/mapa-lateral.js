import { createMap, reducedMotion } from '../../shared/mapa/mapa.js';
import { drawRoute } from './mapa-rota.js';

const isWide = () => window.matchMedia('(min-width: 1100px)').matches;

export function createRouteMap(box, { onMobileMap = () => {} } = {}) {
  let promise = null;
  let handle = null;
  let layers = null;
  let userLayer = null;
  let carpoolLayer = null;
  let carpoolItems = [];
  let selected = null;
  let needsDraw = false;
  let alive = true;

  const isVisible = () => isWide() || box.closest('.tela--dividida')?.dataset.mobileView === 'mapa';

  async function ensure() {
    if (!isVisible()) return null;
    promise ??= createMap(box).then((h) => {
      if (!h) { promise = null; return null; }
      if (!alive) { h.destroy(); return null; }
      handle = h;
      layers = h.group();
      userLayer = h.group();
      carpoolLayer = h.group();
      drawCarpools();
      return h;
    });
    const h = await promise;
    if (!h || !alive) return null;
    h.invalidate();
    if (selected && needsDraw) {
      drawRoute(h, layers, selected);
      needsDraw = false;
    }
    return h;
  }

  function drawCarpools() {
    if (!carpoolLayer) return;
    carpoolLayer.clear();
    // Sem o Google, o traçado é a reta entre a saída e o destino do motorista (tracejada): serve para ver o sentido, não as ruas.
    for (const { driver, geometry, estimated } of carpoolItems) {
      if (!geometry) continue;
      carpoolLayer.line(geometry, { color: '#B85C00', dashed: Boolean(estimated) });
      carpoolLayer.pin(driver.from, { css: 'pino--onibus', ic: 'carro', title: `${driver.motorista} sai às ${driver.hora}` });
      carpoolLayer.pin(driver.to, { ic: 'destino', title: `${driver.motorista} vai até ${driver.destino}` });
    }
  }

  const layoutQuery = window.matchMedia('(min-width: 1100px)');
  function onLayoutChange() {
    if (isVisible()) ensure();
  }
  layoutQuery.addEventListener('change', onLayoutChange);

  return {
    ensure,

    async draw(option) {
      selected = option;
      needsDraw = Boolean(option);
      const h = await ensure();
      if (h && alive && needsDraw) {
        drawRoute(h, layers, selected);
        needsDraw = false;
      }
    },

    async show(option) {
      selected = option;
      needsDraw = true;
      if (!isWide()) onMobileMap();
      await ensure();
    },

    async setUser(point, accuracy = 0) {
      const h = await ensure();
      if (!h || !alive) return;
      userLayer.clear();
      if (accuracy > 15) userLayer.circle(point, accuracy);
      userLayer.dot(point);
      if (!reducedMotion()) h.panTo(point); else h.setView(point);
    },
    clearUser() { userLayer?.clear(); },

    async setCarpools(items) {
      carpoolItems = items;
      if (items.length && !isWide()) onMobileMap();
      const h = await ensure();
      drawCarpools();
      if (h && items.length) {
        const mine = selected?.legs ? selected.legs.flatMap((l) => l.geometry) : (selected?.geometry ?? []);
        h.fit([...mine, ...items.flatMap((i) => i.geometry ?? [])]);
      }
    },
    destroy() {
      alive = false;
      layoutQuery.removeEventListener('change', onLayoutChange);
      handle?.destroy();
    },
  };
}
