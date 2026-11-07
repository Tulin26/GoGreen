import { defineConfig, loadEnv } from 'vite';

// No `npm run dev`, serve /api/auth e /api/db com o mesmo código que roda na Vercel, usando o .env.local (DATABASE_URL, AUTH_SECRET).
function apiLocal() {
  return {
    name: 'gogreen-api-local',
    apply: 'serve',
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) process.env[k] ??= v;
      server.middlewares.use('/api', async (req, res, next) => {
        const nome = req.url.split('?')[0].replace(/^\//, '');
        if (nome !== 'auth' && nome !== 'db') return next();
        const { tratarAuth, tratarDb } = await server.ssrLoadModule('/api/_lib/rotas.js');
        let texto = '';
        for await (const parte of req) texto += parte;
        let corpo;
        try { corpo = texto ? JSON.parse(texto) : {}; } catch { corpo = {}; }
        const r = await (nome === 'auth' ? tratarAuth : tratarDb)({ metodo: req.method, cabecalhos: req.headers, corpo });
        if (r.cookie) res.setHeader('Set-Cookie', r.cookie);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = r.status;
        res.end(JSON.stringify(r.corpo));
      });
    },
  };
}

export default defineConfig({
  plugins: [apiLocal()],
  build: { target: 'es2020', chunkSizeWarningLimit: 700 },
});
