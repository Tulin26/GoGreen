const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtMoney = (v) => (v === 0 ? 'Grátis' : money.format(v));
export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

export function fmtMin(min) {
  const m = Math.round(min);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export function fmtCo2(g) {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.', ',')} kg`;
  return `${Math.round(g)} g`;
}

export function fmtAgo(iso, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
