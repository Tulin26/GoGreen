import { CITY } from '../../config/cidade.js';
import { icon } from '../ui/icones.js';
import { googleErrorText, importLibrary } from './google.js';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                                                                                                         
const MAP_ID = 'DEMO_MAP_ID';
const toLatLng = ([lat, lng]) => ({ lat, lng });

                                                                                 
function makeGroup(getLib) {
  const commands = [];
  let removers = [];
  const draw = (command) => {
    const { item, remove } = command(getLib());
    removers.push(remove);
    return item;
  };
  const keep = (command) => { commands.push(command); return draw(command); };
  const detach = () => removers.splice(0).forEach((remove) => remove());
  const redraw = () => { detach(); commands.forEach(draw); };
  return {
                                                                                                         
    line(points, { color = '#0B4A9E', dashed = false } = {}) {
      return keep((lib) => {
        const path = points.map(toLatLng);
        const outline = new lib.Polyline({ path, strokeColor: '#FFFFFF', strokeOpacity: 0.9, strokeWeight: 8, zIndex: 1, map: lib.map });
        const dashIcon = { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 };
        const main = new lib.Polyline({
          path, strokeColor: color, zIndex: 2, map: lib.map,
          ...(dashed ? { strokeOpacity: 0, icons: [{ icon: dashIcon, offset: '0', repeat: '12px' }] } : { strokeOpacity: 1, strokeWeight: 5 }),
        });
        return { item: [outline, main], remove: () => { outline.setMap(null); main.setMap(null); } };
      });
    },
                                                     
    pin(point, { css = 'pino--ponto', ic = 'ponto', title = '', extra = "", onClick } = {}) {
      return keep((lib) => {
        const el = document.createElement('div');
        el.style.transform = 'translate(0, 50%)';                                                                 
        el.innerHTML = `<span class="pino ${css}">${icon(ic)}${extra}</span>`;
        const marker = new lib.AdvancedMarkerElement({ map: lib.map, position: toLatLng(point), content: el, title, gmpClickable: Boolean(onClick) });
        if (onClick) marker.addEventListener('gmp-click', onClick);
        return { item: marker, remove: () => { marker.map = null; } };
      });
    },
                                                 
    circle(point, radius) {
      return keep((lib) => {
        const c = new lib.Circle({ center: toLatLng(point), radius, strokeWeight: 1, strokeColor: '#0B4A9E', fillColor: '#0B4A9E', fillOpacity: 0.12, clickable: false, map: lib.map });
        return { item: c, remove: () => c.setMap(null) };
      });
    },
                                       
    dot(point) {
      return keep((lib) => {
        const el = document.createElement('div');
        el.style.transform = 'translate(0, 50%)';
        el.innerHTML = '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#0B4A9E;border:3px solid #fff;box-shadow:0 0 0 2px #0B4A9E"></span>';
        const marker = new lib.AdvancedMarkerElement({ map: lib.map, position: toLatLng(point), content: el, title: 'Você' });
        return { item: marker, remove: () => { marker.map = null; } };
      });
    },
    clear() { commands.length = 0; detach(); },
    detach,
    redraw,
  };
}

export const mapErrorHtml = (text) => `<div class="mapa__erro" role="status"><span>${text}</span><button class="btn btn-link botao botao--texto" type="button" data-tentar>Tentar de novo</button></div>`;

function showMapError(container, text, retry) {
  container.querySelector('.mapa__erro')?.remove();
  container.insertAdjacentHTML('beforeend', mapErrorHtml(text));
  const box = container.querySelector('.mapa__erro');
  box.querySelector('[data-tentar]').onclick = () => { box.remove(); retry(); };
}

   
                                                                                                                   
                                                                                                                             
   
export async function createMap(container, { center = CITY.center, zoom = 13 } = {}) {
  let libs;
  try {
    const [{ Map, Polyline, Circle }, { AdvancedMarkerElement }, { LatLngBounds, event, ColorScheme }] = await Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('core')]);
    libs = { Map, Polyline, Circle, AdvancedMarkerElement, LatLngBounds, event, ColorScheme };
  } catch (e) {
    const retry = () => createMap(container, { center, zoom });
    showMapError(container, googleErrorText(e), retry);
    return null;
  }
  container.classList.add('google-map-host');
  let el;
  let map;
  let lib;
  let currentCenter = center;
  let currentZoom = zoom;
  let dead = false;
  const groups = [];
  const makeInstance = () => {
    el = document.createElement('div');
    el.className = 'google-map';
    el.style.cssText = 'position:absolute;inset:0';
    container.prepend(el);
    const theme = document.documentElement.getAttribute('data-theme');
    const colorScheme = theme === 'dark' ? libs.ColorScheme.DARK : theme === 'light' ? libs.ColorScheme.LIGHT : libs.ColorScheme.FOLLOW_SYSTEM;
    map = new libs.Map(el, {
      center: toLatLng(currentCenter), zoom: currentZoom, mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy',
      clickableIcons: false, colorScheme,
    });
    lib = { ...libs, map };
    groups.forEach((group) => group.redraw());
  };
  const recreateForTheme = () => {
    if (dead) return;
    const c = map.getCenter();
    currentCenter = c ? [c.lat(), c.lng()] : currentCenter;
    currentZoom = map.getZoom() ?? currentZoom;
    groups.forEach((group) => group.detach());
    el.remove();
    makeInstance();
  };
  makeInstance();
  window.addEventListener('gogreen:themechange', recreateForTheme);
  return {
    get map() { return map; },
    group() { const g = makeGroup(() => lib); groups.push(g); return g; },
                                                         
    fit(points, padding = 40) {
      if (!points.length) return;
      if (points.length === 1) { map.setCenter(toLatLng(points[0])); map.setZoom(16); return; }
      const bounds = new libs.LatLngBounds();
      points.forEach((p) => bounds.extend(toLatLng(p)));
      map.fitBounds(bounds, padding);
    },
    setView(point, zoom2) { map.setCenter(toLatLng(point)); if (zoom2) map.setZoom(zoom2); },
    panTo(point) { map.panTo(toLatLng(point)); },
    center() { const c = map.getCenter(); return [c.lat(), c.lng()]; },
    invalidate() { libs.event.trigger(map, 'resize'); },
    destroy() { dead = true; window.removeEventListener('gogreen:themechange', recreateForTheme); groups.forEach((g) => g.clear()); el.remove(); },
  };
}
