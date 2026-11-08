

const { chromium } = require('playwright');
const { spawn, spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'node_modules/.dist-e2e');
const PORT = 4181;
const BASE = `http://localhost:${PORT}/`;
const cors = { 'access-control-allow-origin': '*' };
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); if (!ok) fails += 1; };

const FAKE_GOOGLE = fs.readFileSync(path.join(__dirname, 'fake-google.js'), 'utf8');
const { respostaFalsa } = require('./fake-osrm.cjs');
async function stubs(ctx) {
  await ctx.route('**/api/combustiveis', (r) => r.fulfill({ json: { municipio: 'Araçatuba', fonte: 'ANP', periodo: { inicio: '2026-10-25', fim: '2026-10-31' }, precos: { gasolina: 6.3, etanol: 3.59, diesel: 7.32 } }, headers: cors }));
  await ctx.route('**/dados/consumo.json*', (r) => r.fulfill({ json: { carros: [] }, headers: cors }));
  await ctx.route('https://maps.googleapis.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_GOOGLE }));
  await ctx.route('https://routing.openstreetmap.de/**', (r) => r.fulfill({ json: respostaFalsa(r.request().url()), headers: { 'access-control-allow-origin': '*' } }));
}

(async () => {
  const build = spawnSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: ROOT, env: { ...process.env, VITE_GOOGLE_MAPS_KEY: 'chave-de-teste', VITE_USAR_BANCO: '' }, stdio: 'ignore', shell: process.platform === 'win32' });
  if (build.status !== 0) throw new Error('build falhou');
  const server = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: process.platform !== 'win32', shell: process.platform === 'win32' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const [label, viewport] of [['celular', { width: 390, height: 844 }], ['computador', { width: 1280, height: 900 }]]) {
      const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', permissions: ['geolocation'], geolocation: { latitude: -21.203169, longitude: -50.4385078 } });
      await stubs(ctx);
      const page = await ctx.newPage();
      const abrirForm = async () => { if (await page.locator('[data-voltar]').isVisible()) await page.click('[data-voltar]'); };
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`console: ${m.text()}`); });

      await page.goto(`${BASE}#/rotas`);
      await page.waitForSelector('[data-comparar]');
      check(`${label}: não há aba Trajeto, tudo fica em Rotas`, (await page.locator('a[data-nav="trajeto"]').count()) === 0);

      await page.click('[data-gps-botao]');
      await page.waitForFunction(() => /^(Rua|Avenida|Alameda|Travessa|Praça|Perto de) /.test(document.getElementById('r-de').value), null, { timeout: 20000 });
      await page.waitForFunction(() => window.__gm.liveMarkers().some((m) => m.title === 'Você'), null, { timeout: 15000 });
      check(`${label}: minha localização vira o nome da rua e aparece no mapa`, true, await page.inputValue('#r-de'));

      await abrirForm();
      await page.fill('#r-de', 'Terminal Urbano');
      await page.fill('#r-para', 'rua tamoios 101');
      await page.click('[data-comparar]');
      await page.locator('.resultado-cabeca').waitFor({ timeout: 30000 });
      check(`${label}: com o resultado na tela, o formulário some e só o Voltar fica em cima`, await page.locator('[data-form]').isHidden() && await page.locator('[data-voltar]').isVisible());
      check(`${label}: acha rua com número de casa (Rua Tamoios, 101)`, /Rua Tamoios, 101/.test(await page.locator('.resultado-cabeca').innerText()));

      await abrirForm();
      check(`${label}: Voltar reabre o formulário e esconde o resultado`, await page.locator('[data-form]').isVisible() && await page.locator('[data-resultado]').isHidden());
      await page.fill('#r-de', '');
      await page.focus('#r-de');
      const recentes = page.locator('[data-sugestoes]');
      await recentes.getByText('Pesquisados recentemente').waitFor({ timeout: 5000 });
      const textoRecentes = await recentes.innerText();
      check(`${label}: mostra o histórico de lugares pesquisados`, /Rua Tamoios, 101/.test(textoRecentes) && /Terminal Urbano/.test(textoRecentes));
      await recentes.locator('[data-recente]', { hasText: 'Rua Tamoios, 101' }).click();
      check(`${label}: escolher um recente preenche o campo`, (await page.inputValue('#r-de')) === 'Rua Tamoios, 101');
      await page.focus('#r-para');
      await page.fill('#r-para', '');
      await page.focus('#r-de');
      await page.fill('#r-de', '');
      await page.focus('#r-de');
      await recentes.locator('[data-limpar-historico]').click();
      await page.focus('#r-de');
      check(`${label}: limpar apaga o histórico`, !/Pesquisados recentemente/.test(await recentes.innerText()));

      await page.evaluate(() => {
        window.__gmSuggest = () => [{ placePrediction: { mainText: { text: 'Farmácia Teste' }, secondaryText: { text: 'Rua Exemplo, Araçatuba' }, text: { text: 'Farmácia Teste, Rua Exemplo' }, toPlace: () => ({ fetchFields: async () => {}, location: { lat: () => -21.2, lng: () => -50.43 } }) } }];
      });
      await abrirForm();
      await page.fill('#r-para', 'farmacia');
      await page.locator('[data-sugestoes] [data-escolha]', { hasText: 'Farmácia Teste' }).click({ timeout: 15000 });
      check(`${label}: sugestão do Google preenche o campo ao escolher`, (await page.inputValue('#r-para')) === 'Farmácia Teste');
      await page.evaluate(() => { window.__gmSuggest = undefined; });
      await abrirForm();
      await page.fill('#r-de', 'Terminal Urbano');
      await page.fill('#r-para', 'Fatec Araçatuba');
      await page.fill('#r-hora', '07:10');
      await page.click('[data-comparar]');

      await page.locator('[data-extras] .cartao-rota').first().waitFor({ timeout: 30000 });
      const extras = await page.locator('[data-extras]').innerText();
      check(`${label}: mostra ônibus pelos pontos, bicicleta de aluguel e carona`, /Ônibus pelos pontos/.test(extras) && /Bicicleta de aluguel/.test(extras) && /Carona/.test(extras));
      check(`${label}: cartões têm horário de saída e chegada`, /Saia às .* chega às/.test(extras));

      const bike = page.locator('[data-extras] article', { hasText: 'Bicicleta de aluguel' }).filter({ hasText: /Caminhe [1-9]\d* m até/ }).first();
      await bike.getByRole('button', { name: /Ver rota e passo a passo/ }).click();
      await bike.locator('.passos li').first().waitFor({ state: 'attached', timeout: 30000 });
      const bikeSteps = await bike.locator('.passos').textContent();
      check(`${label}: bicicleta leva até a estação e depois ao destino`, /estação/.test(bikeSteps) && /pedale/.test(bikeSteps));
      await page.waitForTimeout(500);
      check(`${label}: o mapa mostra mais de um trecho`, (await page.evaluate(() => window.__gm.livePolylines())) >= 4);

      check(`${label}: avisa que as rotas vêm do OpenStreetMap e podem não ter calçada ou ciclovia`, /OpenStreetMap/.test(await page.locator('[data-aviso-beta]').innerText()));

      const toList = () => (label === 'celular' ? page.click('[data-visao-rota="lista"]') : null);
      await toList();

      const onibus = page.locator('[data-extras] article', { hasText: 'Ônibus pelos pontos' }).first();
      await onibus.getByRole('button', { name: /Ver rota e passo a passo/ }).click();
      await onibus.locator('.passos li').first().waitFor({ state: 'attached', timeout: 30000 });
      await toList();

      const carona = page.locator('[data-extras] article', { hasText: 'Carona' }).first();
      await carona.getByRole('button', { name: /Ver rota e passo a passo/ }).click();
      await carona.locator('.passos li').first().waitFor({ state: 'attached', timeout: 30000 });
      const stepsText = await carona.locator('.passos').textContent();
      check(`${label}: carona manda ir até o motorista e seguir com ele`, /(esteja lá|Esteja em).* às/.test(stepsText) && /Vá de carro com/.test(stepsText));
      if (label === 'celular') {
        check('celular: o passo a passo aparece junto do mapa', await page.locator('.passos-mapa').isVisible());
        await toList();
      }

      await page.locator('[data-caronas-perto] [data-pedir]').first().waitFor({ timeout: 40000 });
      const perto = await page.locator('[data-caronas-perto]').innerText();
      check(`${label}: lista as caronas que passam perto, com o desvio de cada uma`, /Desvia .*\(\+/.test(perto) && /mesmo sentido|sentido contrário/.test(perto));
      const orange = () => page.evaluate(() => window.__gm.polylines.some((p) => p.map && p.opts.strokeColor === '#B85C00'));
      check(`${label}: a rota do motorista não aparece sozinha no mapa`, !(await orange()));
      const motorista = page.locator('[data-caronas-perto] li.trajeto__cartao').first();
      await motorista.locator('h3').click();
      await page.waitForFunction(() => window.__gm.polylines.some((p) => p.map && p.opts.strokeColor === '#B85C00'), null, { timeout: 15000 });
      check(`${label}: tocar no cartão do motorista desenha a rota dele (laranja) no mapa`, await orange());
      if (label === 'celular') await page.click('[data-visao-rota="lista"]');
      await motorista.locator('h3').click();
      await page.waitForFunction(() => !window.__gm.polylines.some((p) => p.map && p.opts.strokeColor === '#B85C00'), null, { timeout: 15000 });
      check(`${label}: tocar de novo esconde a rota`, !(await orange()));

      await toList();
      const cartao = page.locator('[data-extras] article', { hasText: 'Bicicleta de aluguel' }).filter({ hasText: /Caminhe [1-9]\d* m até/ }).first();
      const estacaoNome = ((await cartao.innerText()).match(/Caminhe\s+[1-9]\d*\s+m\s+até\s+(.+?),\s+pedale/) ?? [])[1];
      const { EXAMPLE_BIKE_STATIONS } = await import(require('url').pathToFileURL(path.join(ROOT, 'src/config/exemplos.js')).href);
      const estacao = EXAMPLE_BIKE_STATIONS.find((s) => s.nome === estacaoNome);
      check(`${label}: o cartão da bicicleta diz a estação onde pegar`, Boolean(estacao), estacaoNome ?? (await cartao.innerText()).replace(/\s+/g, ' ').slice(0, 260));
      await cartao.locator('.cartao-rota__nome').click();
      await cartao.locator('.passos li').first().waitFor({ state: 'attached', timeout: 30000 });
      check(`${label}: clicar em qualquer parte do cartão escolhe a opção`, /cartao-rota--ativa/.test(await cartao.getAttribute('class')));
      await toList();

      await cartao.getByRole('button', { name: 'Iniciar rota' }).click();
      const guia = page.locator('[data-guia]');
      await guia.getByText(/Passo 1 de 2/).waitFor({ timeout: 30000 });
      check(`${label}: guia começa no primeiro trecho (a pé até a estação)`, new RegExp(`estação ${estacaoNome}`).test(await guia.innerText()));
      await page.waitForFunction(() => window.__gm.liveMarkers().some((m) => m.title === 'Você'), null, { timeout: 15000 });
      check(`${label}: o mapa mostra a posição da pessoa`, (await page.evaluate(() => window.__gm.liveMarkers().some((m) => m.title === 'Você'))));
      await ctx.setGeolocation({ latitude: estacao.coords[0], longitude: estacao.coords[1] });
      await guia.getByText(/Passo 2 de 2/).waitFor({ timeout: 15000 });
      check(`${label}: ao chegar na estação, passa para pedalar`, /pedale/.test(await guia.innerText()));
      await ctx.setGeolocation({ latitude: -21.2, longitude: -50.45 });
      await guia.getByText(/saiu da rota/).waitFor({ timeout: 15000 });
      check(`${label}: avisa quando a pessoa sai do traçado`, true);
      await ctx.setGeolocation({ latitude: -21.1816274, longitude: -50.4496867 });
      await page.getByText('Você chegou ao destino.').waitFor({ timeout: 15000 });
      check(`${label}: ao chegar, o guia termina`, await guia.isHidden());

      await page.goto(`${BASE}#/caronas`);
      await page.locator('[data-aba="nova"][aria-selected="true"]').waitFor({ timeout: 10000 });
      check(`${label}: Caronas abre em "Nova rota" para quem ainda não tem nada`, true);
      await page.click('[data-aba="pedidos"]');
      check(`${label}: a aba Pedidos convida a entrar e esconde o formulário`, /Entre na sua conta/.test(await page.locator('[data-painel="pedidos"]').innerText()) && await page.locator('[data-painel="nova"]').isHidden());
      await page.keyboard.press('ArrowRight');
      check(`${label}: setas do teclado trocam de aba`, (await page.locator('[data-aba][aria-selected="true"]').getAttribute('data-aba')) === 'rotas');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      check(`${label}: sem rolagem horizontal`, !overflow);
      await ctx.close();
    }
  } catch (e) {
    check('execução sem exceção', false, e.message.split('\n').slice(0, 6).join(' / '));
  }
  check('sem erros de script no console', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  try { if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-server.pid); } catch {}
  console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
  process.exit(fails ? 1 : 0);
})();
