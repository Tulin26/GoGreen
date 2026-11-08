const dateBr = (iso) => iso.split('-').reverse().join('/');

export function priceNote(p) {
  const week = p.periodo ? `semana de ${dateBr(p.periodo.inicio)} a ${dateBr(p.periodo.fim)}` : 'última semana publicada';
  return p.salvo ? `Último preço salvo da ANP, ${week}.` : `Preço médio da ANP em Araçatuba, ${week}.`;
}
