import { LINES } from '../../config/linhas-onibus.js';
import { esc } from '../../shared/formato.js';
import { normalize } from '../../shared/texto.js';
import { $ } from '../../shared/ui/dom.js';

/** Linhas cujo número ou nome contém o texto digitado, sem diferenciar acento nem maiúscula. */
export function filterLines(lines, query) {
  const q = normalize(String(query ?? ''));
  if (!q) return lines;
  return lines.filter((l) => normalize(`${l.code} ${l.name}`).includes(q));
}

export const countText = (n) => (n === 0 ? 'Nenhuma linha encontrada' : n === 1 ? '1 linha' : `${n} linhas`);

export const linesListHtml = (lines) => lines.map((l) => `<li><button type="button" data-linha="${l.code}"><span class="lista-linhas__codigo">${l.code}</span>${esc(l.name)}</button></li>`).join('');

/** Liga o campo de busca da lista de linhas: filtra enquanto a pessoa digita; Enter abre a linha quando só sobra uma. */
export function bindLinePicker(root) {
  const input = $('[data-filtro-linha]', root);
  if (!input) return;
  const list = $('[data-lista-linhas]', root);
  const count = $('[data-linhas-contagem]', root);
  const empty = $('[data-linhas-vazio]', root);
  const apply = () => {
    const found = filterLines(LINES, input.value);
    list.innerHTML = linesListHtml(found);
    count.textContent = countText(found.length);
    empty.hidden = found.length > 0;
    list.hidden = found.length === 0;
  };
  input.addEventListener('input', apply);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const found = filterLines(LINES, input.value);
    if (found.length === 1) $(`[data-linha="${found[0].code}"]`, root)?.click();
  });
}
