import { esc } from '../../shared/formato.js';

export function whatsappUrl(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Dias da semana em texto curto: "seg a sex", "fim de semana", "seg, qua, sex". 0 = domingo. */
export function formatDays(dias) {
  const d = [...new Set(dias)].sort((a, b) => a - b);
  if (d.length === 7) return 'todos os dias';
  if (d.join() === '1,2,3,4,5') return 'seg a sex';
  if (d.join() === '0,6') return 'fim de semana';
  return d.map((i) => DIAS[i]).join(', ');
}

export const isClosed = (r) => r.status === 'recusada' || r.status === 'cancelada';

const ORDEM = { pendente: 0, aceita: 1, recusada: 2, cancelada: 3 };

/** O que precisa de resposta vem primeiro; dentro de cada situação, o mais novo no topo. */
export function sortRequests(list) {
  return [...list].sort((a, b) => (ORDEM[a.status] ?? 9) - (ORDEM[b.status] ?? 9) || new Date(b.created_at) - new Date(a.created_at));
}

const dia = (d) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(d);

/** "Hoje", "Ontem" ou dd/mm, no horário de Araçatuba. */
export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (dia(d) === dia(now)) return 'Hoje';
  if (dia(d) === dia(new Date(now.getTime() - 86400000))) return 'Ontem';
  return dia(d).slice(0, 5);
}

const hhmm = (iso) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

/** Mensagens em ordem, com um separador ("Hoje", "Ontem", dd/mm) quando o dia muda. */
export function messagesHtml(msgs, now = new Date()) {
  if (!msgs.length) return '<p class="texto-2">Ninguém escreveu ainda. Combine o valor, o ponto de encontro e o horário.</p>';
  let last = '';
  return msgs.map((m) => {
    const label = dayLabel(m.created_at, now);
    const separator = label !== last ? `<p class="chat__dia"><span>${label}</span></p>` : '';
    last = label;
    return `${separator}<p class="chat__msg${m.mine ? ' chat__msg--minha' : ''}"><span class="chat__autor">${esc(m.mine ? 'Você' : m.autor)} · ${hhmm(m.created_at)}</span>${esc(m.body)}</p>`;
  }).join('');
}

