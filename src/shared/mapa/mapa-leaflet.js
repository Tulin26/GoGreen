import { icon } from '../ui/icones.js';

// Mapa de reserva: OpenStreetMap com o Leaflet. Não usa chave nem cota, então funciona quando o Google falha.
// Tiles do próprio OpenStreetMap (a política deles pede uso leve: aqui é só reserva do Google). O tema escuro é um filtro de CSS.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const temaAtual = () => {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' || t === 'light' ? t : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
};

/** Motor com a mesma interface do motor do Google: draw, fit, setView, panTo, center, invalidate, destroy. */
export async function createLeafletEngine(container, { center, zoom }) {
  const L = (await import('leaflet')).default;
  await import('leaflet/dist/leaflet.css');
  const el = document.createElement('div');
  el.className = 'mapa-leaflet';
  el.style.cssText = 'position:absolute;inset:0';
  container.prepend(el);
  const map = L.map(el, { center, zoom, zoomControl: true, attributionControl: true });
  let tiles = null;
  const paintTiles = () => {
    tiles?.remove();
    el.classList.toggle('mapa-leaflet--escuro', temaAtual() === 'dark');
    tiles = L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUICAO }).addTo(map);
  };
  paintTiles();
  const onTheme = () => paintTiles();
  window.addEventListener('gogreen:themechange', onTheme);

  // O pino é um ícone HTML do próprio app, centrado no ponto (como no motor do Google).
  const htmlIcon = (html) => L.divIcon({ className: 'pino-leaflet', html: `<div style="transform:translate(-50%,-50%)">${html}</div>`, iconSize: [0, 0] });

  const draw = (shape) => {
    if (shape.type === 'line') {
      const outline = L.polyline(shape.points, { color: '#FFFFFF', weight: 8, opacity: 0.9, interactive: false }).addTo(map);
      const main = L.polyline(shape.points, { color: shape.color, weight: 5, opacity: 1, interactive: false, ...(shape.dashed ? { dashArray: '2 10', lineCap: 'butt' } : {}) }).addTo(map);
      return { remove: () => { outline.remove(); main.remove(); } };
    }
    if (shape.type === 'circle') {
      const c = L.circle(shape.point, { radius: shape.radius, color: '#0B4A9E', weight: 1, fillColor: '#0B4A9E', fillOpacity: 0.12, interactive: false }).addTo(map);
      return { remove: () => c.remove() };
    }
    const html = shape.type === 'dot'
      ? '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#0B4A9E;border:3px solid #fff;box-shadow:0 0 0 2px #0B4A9E"></span>'
      : `<span class="pino ${shape.css}">${icon(shape.ic)}${shape.extra}</span>`;
    const marker = L.marker(shape.point, { icon: htmlIcon(html), title: shape.type === 'dot' ? 'Você' : shape.title, keyboard: Boolean(shape.onClick), interactive: Boolean(shape.onClick) }).addTo(map);
    if (shape.onClick) marker.on('click', shape.onClick);
    return { remove: () => marker.remove() };
  };

  const pad = (p) => (typeof p === 'number' ? { padding: [p, p] } : { paddingTopLeft: [p.left ?? 40, p.top ?? 40], paddingBottomRight: [p.right ?? 40, p.bottom ?? 40] });
  return {
    name: 'leaflet',
    draw,
    fit(points, padding = 40) {
      if (!points.length) return;
      if (points.length === 1) { map.setView(points[0], 16); return; }
      map.fitBounds(L.latLngBounds(points), { ...pad(padding), maxZoom: 17 });
    },
    setView: (point, zoom2) => map.setView(point, zoom2 ?? map.getZoom()),
    panTo: (point) => map.panTo(point),
    center: () => { const c = map.getCenter(); return [c.lat, c.lng]; },
    invalidate: () => map.invalidateSize(),
    destroy() { window.removeEventListener('gogreen:themechange', onTheme); map.remove(); el.remove(); },
  };
}
