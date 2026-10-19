import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Runs the Vercel functions in api/ during `npm run dev`, so the app works
 * locally without the Vercel CLI. (On Vercel they run as serverless functions.)
 */
function localApi(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!/^\/api\/[a-z]+(\/[a-z]+)*$/.test(url.pathname)) return next();
        try {
          const mod = await server.ssrLoadModule(url.pathname + '.ts');
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined;
          if (!handler) { res.statusCode = 405; res.end(); return; }
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const out = await handler(new Request(url.href, { method: req.method, headers }));
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env values visible to the local API functions (server side only).
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
  return {
    plugins: [react(), localApi()],
    test: { include: ['tests/unit/**/*.test.ts'] },
  };
});
