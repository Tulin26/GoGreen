                                                                                   
export const ROUTES = {
  rotas: { view: () => import('../features/rotas/rotas.view.js').then((m) => m.renderRotas), nav: 'rotas', title: 'Rotas' },
  caronas: { view: () => import('../features/caronas/caronas.view.js').then((m) => m.renderCaronas), nav: 'caronas', title: 'Caronas' },
  onibus: { view: () => import('../features/onibus/onibus.view.js').then((m) => m.renderOnibus), nav: 'onibus', title: 'Ônibus' },
  perfil: { view: () => import('../features/perfil/perfil.view.js').then((m) => m.renderPerfil), nav: null, title: 'Seu perfil' },
};

export const NAV = [['rotas', 'Rotas', 'rota'], ['caronas', 'Caronas', 'carro'], ['onibus', 'Ônibus', 'onibus']];
