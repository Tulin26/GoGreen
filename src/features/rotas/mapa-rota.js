const MODE_COLOR = { foot: '#00603C', bike: '#7A3E00', bus: '#0B4A9E', car: '#3C4448', moto: '#5D4B8A' };

export function drawRoute(h, group, option) {
  group.clear();
  const legs = option.legs ?? [{ mode: option.mode, geometry: option.geometry }];
  for (const leg of legs) group.line(leg.geometry, { color: MODE_COLOR[leg.mode], dashed: leg.mode === 'foot' });
  const all = legs.flatMap((l) => l.geometry);
  group.pin(all[0], { ic: 'origem', title: 'Origem' });
  group.pin(all.at(-1), { ic: 'destino', title: 'Destino' });
  for (const mk of option.markers ?? []) group.pin(mk.point, { ic: 'ponto', title: mk.label });
  h.fit(all);
}
