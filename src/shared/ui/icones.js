

const svg = (body, attrs = '') =>
  `<svg class="icone" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${attrs}>${body}</svg>`;

export const icons = {

  carro: svg('<path d="M5 11l1.5-4.3A2.5 2.5 0 0 1 8.9 5h6.2a2.5 2.5 0 0 1 2.4 1.7L19 11"/><path d="M4 11h16a1 1 0 0 1 1 1v5H3v-5a1 1 0 0 1 1-1z"/><path d="M6 17v2.5M18 17v2.5"/><path d="M7 14h.01M17 14h.01"/>'),
  moto: svg('<circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M5.5 17.5h4l3-6h3l3 6h-4l-2-3h-3l-2 3M12.5 11.5l-1-3h3M15.5 11.5h2l1 2"/>'),
  onibus: svg('<rect x="4" y="3" width="16" height="14.5" rx="2"/><path d="M4 10.5h16M12 3v7.5"/><path d="M7 17.5V20.5M17 17.5V20.5"/><path d="M8 14h.01M16 14h.01"/>'),
  bike: svg('<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M5.5 17 9 9.5h6.2L18.5 17"/><path d="M9 9.5 12 17l3.2-7.5"/><path d="M7.5 6.5H11M9 9.5 8.8 6.5"/><path d="M13.8 6h2.7l-1.3 3.5"/>'),
  ape: svg('<circle cx="13" cy="4.5" r="1.8"/><path d="M12.5 8.5 10.5 14l3.5 2.5 1 5"/><path d="M10.5 14 8.5 21.5"/><path d="M12.5 8.5l3 2.8 3 .7"/><path d="M12.5 8.5 8.5 10l-1.5 3.5"/>'),

  alerta: svg('<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="M12 8v5M12 16.5h.01"/>'),
  losango: svg('<path d="M12 2 22 12 12 22 2 12z" fill="#FFC81E" stroke="#15191B"/><path d="M12 7.5V13M12 16.5h.01" stroke="#15191B" stroke-width="2.4"/>'),
  octogono: svg('<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="#C3161C" stroke="#FFFFFF" stroke-width="1"/><path d="M12 7v6.5M12 17h.01" stroke="#FFFFFF" stroke-width="2.6"/>'),
  info: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5M12 7.5h.01"/>'),

  buraco: svg('<path d="M3.5 15 7 10.5l3.5 1 3-2.5 5 1.5 2 4-3.5 3.5-5-1-3.5 1.5z" fill="currentColor"/><path d="M13.5 9V5M7 10.5 5 7M18.5 10.5 20.5 7"/>'),
  rampa: svg('<circle cx="10" cy="4.5" r="1.8"/><path d="M10 8.5V14h5l2.5 5.5"/><path d="M10 10.5h5"/><path d="M7.5 11a5.2 5.2 0 1 0 6.8 6.5"/>'),
  luz: svg('<path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.8.7 1.2 1.5 1.2 2.4h5.6c0-.9.4-1.7 1.2-2.4A6.5 6.5 0 0 0 12 2.5z"/><path d="M9.5 20h5M10.5 22.5h3"/>'),
  cobertura: svg('<path d="M2.5 5.5h19L19.5 9h-15z"/><path d="M6 9v12M18 9v12"/><path d="M6 16h12"/>'),
  calcada: svg('<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="M2.5 12H9M15 12h6.5M7 5v7M17 12v7"/><path d="M14 5l-3 3.5 2.5 3-3 3 2 4.5"/>'),

  localizacao: svg('<path d="M12 21.5s7.5-6.5 7.5-12a7.5 7.5 0 0 0-15 0c0 5.5 7.5 12 7.5 12z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  minhaLocalizacao: svg('<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/>'),
  semGps: svg('<path d="M8.5 4.4A7.5 7.5 0 0 1 19.5 9.5c0 2.2-1.2 4.6-2.7 6.6M13.9 18.9c-1 1.2-1.9 2.1-1.9 2.1s-7.5-5.9-7.5-11.5c0-1 .2-1.9.5-2.8"/><path d="M3 3l18 18"/>'),
  origem: svg('<circle cx="12" cy="12" r="6" fill="var(--cor-superficie, #fff)" stroke-width="3"/>'),
  destino: svg('<path d="M12 22s8-6.8 8-12.5a8 8 0 0 0-16 0C4 15.2 12 22 12 22z" fill="currentColor"/><circle cx="12" cy="9.5" r="2.8" fill="var(--cor-superficie, #fff)" stroke="none"/>'),
  ponto: svg('<path d="M12 22V10"/><rect x="6" y="2.5" width="12" height="8" rx="1.5"/><path d="M9 6.5h6"/><path d="M8.5 22h7"/>'),
  mapa: svg('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  rota: svg('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>'),

  aoVivo: svg('<circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4"/><path d="M4.6 19.4a10.5 10.5 0 0 1 0-14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>'),
  semRede: svg('<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 6-.8M5 12.8a10 10 0 0 1 4-2.4M19 12.8a10 10 0 0 0-5.2-2.7M2 9a15 15 0 0 1 4-2.7M22 9A15 15 0 0 0 10.5 5.1"/><path d="M12 20h.01"/>'),

  busca: svg('<circle cx="10.5" cy="10.5" r="7"/><path d="m21 21-5.5-5.5"/>'),
  trocar: svg('<path d="M8 20V5M8 5 4 9M8 5l4 4"/><path d="M16 4v15M16 19l-4-4M16 19l4-4"/>'),
  camera: svg('<path d="M4 7.5h3.5L9 5h6l1.5 2.5H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="m4.5 12.5 5 5 10-11"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  setaDireita: svg('<path d="M4 12h15M13 6l6 6-6 6"/>'),
  setaCima: svg('<path d="M12 21V4M5 11l7-7 7 7"/>', ' stroke-width="3"'),
  chevronBaixo: svg('<path d="m6 9 6 6 6-6"/>'),
  chevronDireita: svg('<path d="m9 6 6 6-6 6"/>'),
  sol: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
  lua: svg('<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>'),
  sinal: svg('<rect x="8" y="2.5" width="8" height="16" rx="2"/><path d="M12 18.5V22M12 7h.01M12 10.5h.01M12 14h.01"/>'),

  olho: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
  olhoFechado: svg('<path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6A16.8 16.8 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/>'),

  grafico: svg('<path d="M3.5 20.5h17"/><path d="M7 20.5V13M12 20.5V5M17 20.5V10"/>', ' stroke-width="2.6"'),
  folha: svg('<path d="M20.5 3.5c-9.8 0-16 3.8-16 10.4a6.6 6.6 0 0 0 6.6 6.6c6.7 0 9.4-7 9.4-17z"/><path d="M4 21c2.4-5 6.4-8.2 12-11"/>'),
  pessoa: svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  lupa: svg('<circle cx="10.5" cy="10.5" r="7"/><path d="m21 21-5.5-5.5"/><path d="M10.5 7.5v3l2 1.5"/>'),
};

export function icon(nome, { size, label } = {}) {
  let s = icons[nome];
  if (!s) throw new Error(`Ícone desconhecido: ${nome}`);
  if (size) s = s.replace('width="24" height="24"', `width="${size}" height="${size}"`);
  if (label) s = s.replace('aria-hidden="true"', `role="img" aria-label="${label}"`);
  return s;
}
