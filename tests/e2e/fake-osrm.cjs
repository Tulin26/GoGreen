// Servidor de rotas falso (formato OSRM) para os testes de tela: uma linha com uma curva suave entre os pontos, sem rede.
const VELOCIDADE = { foot: 4.8, bike: 15, car: 30 };

function metros(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** url do pedido de rota -> corpo JSON da resposta. */
function respostaFalsa(url) {
  const u = new URL(url);
  const m = u.pathname.match(/routed-(foot|bike|car)\/route\/v1\/driving\/(.+)$/);
  if (!m) return { code: 'InvalidUrl', routes: [] };
  const pts = decodeURIComponent(m[2]).split(';').map((p) => p.split(',').map(Number)); // [lng, lat]
  const rota = (curva) => {
    const coordinates = [];
    let distancia = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      distancia += metros([a[1], a[0]], [b[1], b[0]]) * 1.2;
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        coordinates.push([a[0] + (b[0] - a[0]) * t + curva * Math.sin(Math.PI * t), a[1] + (b[1] - a[1]) * t]);
      }
    }
    return { distance: distancia, duration: (distancia / 1000 / VELOCIDADE[m[1]]) * 3600, geometry: { coordinates } };
  };
  return { code: 'Ok', routes: u.searchParams.get('alternatives') === 'true' ? [rota(0), rota(0.004)] : [rota(0)] };
}

module.exports = { respostaFalsa };
