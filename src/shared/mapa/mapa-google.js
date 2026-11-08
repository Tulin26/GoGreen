import { icon } from '../ui/icones.js';
import { importLibrary } from './google.js';

const MAP_ID = 'DEMO_MAP_ID';
const toLatLng = ([lat, lng]) => ({ lat, lng });

/** Motor do Google Maps. hooks.before/after rodam em volta da recriação do mapa (troca de tema), para o grupo se redesenhar. */
export async function createGoogleEngine(container, { center, zoom }, hooks = {}) {
  const [{ Map, Polyline, Circle }, { AdvancedMarkerElement }, { LatLngBounds, event, ColorScheme }] = await Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('core')]);
  container.classList.add('google-map-host');
  let el;
  let map;
  let currentCenter = center;
  let currentZoom = zoom;
  let dead = false;

  const makeInstance = () => {
    el = document.createElement('div');
    el.className = 'google-map';
    el.style.cssText = 'position:absolute;inset:0';
    container.prepend(el);
    const theme = document.documentElement.getAttribute('data-theme');
    const colorScheme = theme === 'dark' ? ColorScheme.DARK : theme === 'light' ? ColorScheme.LIGHT : ColorScheme.FOLLOW_SYSTEM;
    map = new Map(el, { center: toLatLng(currentCenter), zoom: currentZoom, mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false, colorScheme });
  };
  const recreateForTheme = () => {
    if (dead) return;
    const c = map.getCenter();
    currentCenter = c ? [c.lat(), c.lng()] : currentCenter;
    currentZoom = map.getZoom() ?? currentZoom;
    hooks.before?.();
    el.remove();
    makeInstance();
    hooks.after?.();
  };
  makeInstance();
  window.addEventListener('gogreen:themechange', recreateForTheme);

  function draw(shape) {
    if (shape.type === 'line') {
      const path = shape.points.map(toLatLng);
      const outline = new Polyline({ path, strokeColor: '#FFFFFF', strokeOpacity: 0.9, strokeWeight: 8, zIndex: 1, map });
      const dashIcon = { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 };
      const main = new Polyline({
        path, strokeColor: shape.color, zIndex: 2, map,
        ...(shape.dashed ? { strokeOpacity: 0, icons: [{ icon: dashIcon, offset: '0', repeat: '12px' }] } : { strokeOpacity: 1, strokeWeight: 5 }),
      });
      return { remove: () => { outline.setMap(null); main.setMap(null); } };
    }
    if (shape.type === 'circle') {
      const c = new Circle({ center: toLatLng(shape.point), radius: shape.radius, strokeWeight: 1, strokeColor: '#0B4A9E', fillColor: '#0B4A9E', fillOpacity: 0.12, clickable: false, map });
      return { remove: () => c.setMap(null) };
    }
    const content = document.createElement('div');
    content.style.transform = 'translate(0, 50%)';
    content.innerHTML = shape.type === 'dot'
      ? '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#0B4A9E;border:3px solid #fff;box-shadow:0 0 0 2px #0B4A9E"></span>'
      : `<span class="pino ${shape.css}">${icon(shape.ic)}${shape.extra}</span>`;
    const marker = new AdvancedMarkerElement({ map, position: toLatLng(shape.point), content, title: shape.type === 'dot' ? 'Você' : shape.title, gmpClickable: Boolean(shape.onClick) });
    if (shape.onClick) marker.addEventListener('gmp-click', shape.onClick);
    return { remove: () => { marker.map = null; } };
  }

  return {
    name: 'google',
    draw,
    fit(points, padding = 40) {
      if (!points.length) return;
      if (points.length === 1) { map.setCenter(toLatLng(points[0])); map.setZoom(16); return; }
      const bounds = new LatLngBounds();
      points.forEach((p) => bounds.extend(toLatLng(p)));
      map.fitBounds(bounds, padding);
    },
    setView(point, zoom2) { map.setCenter(toLatLng(point)); if (zoom2) map.setZoom(zoom2); },
    panTo: (point) => map.panTo(toLatLng(point)),
    center() { const c = map.getCenter(); return [c.lat(), c.lng()]; },
    invalidate: () => event.trigger(map, 'resize'),
    destroy() { dead = true; window.removeEventListener('gogreen:themechange', recreateForTheme); el.remove(); },
  };
}
