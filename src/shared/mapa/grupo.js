/**
 * Grupo de desenhos do mapa (linhas, pinos, círculos). Guarda a descrição de cada desenho, não o objeto do mapa,
 * então dá para redesenhar tudo quando o motor do mapa troca (tema escuro/claro, ou Google que falha e vira OpenStreetMap).
 * engine: () => motor atual, com draw(descrição) que devolve { remove }.
 */
export function makeGroup(engine) {
  const shapes = [];
  let live = [];
  const draw = (shape) => { live.push(engine().draw(shape)); };
  const add = (shape) => { shapes.push(shape); if (engine()) draw(shape); return { remove: () => { const i = shapes.indexOf(shape); if (i >= 0) shapes.splice(i, 1); } }; };
  const detach = () => live.splice(0).forEach((item) => item?.remove?.());
  return {
    line: (points, { color = '#0B4A9E', dashed = false } = {}) => add({ type: 'line', points, color, dashed }),
    pin: (point, { css = 'pino--ponto', ic = 'ponto', title = '', extra = '', onClick } = {}) => add({ type: 'pin', point, css, ic, title, extra, onClick }),
    circle: (point, radius) => add({ type: 'circle', point, radius }),
    dot: (point) => add({ type: 'dot', point }),
    clear() { shapes.length = 0; detach(); },
    detach,
    redraw() { detach(); if (engine()) shapes.forEach(draw); },
    size: () => shapes.length,
  };
}
