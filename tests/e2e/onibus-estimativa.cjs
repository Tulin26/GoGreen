                                                                                                                     
                                                                                                                         
                                            
const { chromium } = require('playwright');
const { spawn, spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(ROOT, 'node_modules/.dist-e2e-onibus');
const PORT = 4183;
const BASE = `http://localhost:${PORT}/`;
const cors = { 'access-control-allow-origin': '*' };
const FAKE_GOOGLE = fs.readFileSync(path.join(__dirname, 'fake-google.js'), 'utf8');
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); if (!ok) fails += 1; };

                                                                                          
const MIDDLE = { latitude: (-21.203169 + -21.24) / 2, longitude: (-50.4385078 + -50.49) / 2 };

(async () => {
  const build = spawnSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: ROOT, env: { ...process.env, VITE_GOOGLE_MAPS_KEY: 'chave-de-teste', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }, stdio: 'ignore', shell: process.platform === 'win32' });
  if (build.status !== 0) throw new Error('build falhou');
  const server = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: process.platform !== 'win32', shell: process.platform === 'win32' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {                     } await new Promise((r) => setTimeout(r, 500)); }
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const [label, viewport] of [['celular', { width: 390, height: 844 }], ['computador', { width: 1280, height: 900 }]]) {
      const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', permissions: ['geolocation'], geolocation: MIDDLE });
      await ctx.route('https://maps.googleapis.com/**', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_GOOGLE }));
      await ctx.route('**/api/combustiveis', (r) => r.fulfill({ json: { precos: { gasolina: 6.3, etanol: 3.59, diesel: 7.32 } }, headers: cors }));
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`console: ${m.text()}`); });
      await page.clock.setFixedTime(new Date('2026-11-03T10:30:00Z'));                             

      await page.goto(`${BASE}#/onibus`);
      await page.locator('[data-linha="103"]').click();
      await page.locator('.previsao--estimativa .regua').waitFor({ timeout: 30000 });
      check(`${label}: mostra o selo ESTIMATIVA e o trajeto até o fim da linha`, /ESTIMATIVA/.test(await page.locator('.previsao--estimativa').innerText()) && /Bairro Teste/.test(await page.locator('.regua').innerText()));

      check(`${label}: a régua tem o ônibus que saiu às 07:20`, (await page.locator('.regua__onibus--ida').count()) === 1);
      check(`${label}: o mapa mostra o ônibus estimado e o trajeto`, await page.evaluate(() => window.__gm.liveMarkers().some((m) => /Ônibus estimado da linha 103/.test(m.title)) && window.__gm.livePolylines() >= 2));
      const where = await page.locator('.regua__onibus--ida').getAttribute('style');
      const left = Number(/left:\s*([\d.]+)%/.exec(where)[1]);
      check(`${label}: o ônibus está no trecho certo (10 min de uma viagem de ~24: perto de 40%)`, left > 25 && left < 55, `${left}%`);

      await page.locator('[data-gps]').click();
      await page.locator('.previsao--estimativa .previsao__valor').waitFor({ timeout: 20000 });
      const eta = await page.locator('.previsao--estimativa').innerText();
      check(`${label}: diz a que horas o ônibus passa pelo ponto da pessoa`, /Passa pelo seu ponto às \d\d:\d\d/.test(eta) && /min/.test(eta));
      check(`${label}: a pessoa aparece na régua`, (await page.locator('.regua__voce').count()) === 1);

      await ctx.close();
    }
  } catch (e) {
    check('execução sem exceção', false, e.message.split('\n').slice(0, 4).join(' '));
  }
  check('sem erros de script no console', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  try { if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); else process.kill(-server.pid); } catch {                    }
  console.log(fails ? `\n${fails} falha(s)` : '\nTudo certo');
  process.exit(fails ? 1 : 0);
})();
