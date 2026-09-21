import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const assetRoot = path.join(root, 'assets');
const routes = new Map([
  ['/', [path.join(root, 'index.html'), 'text/html; charset=utf-8']],
  ['/index.html', [path.join(root, 'index.html'), 'text/html; charset=utf-8']],
  ['/app.mjs', [path.join(root, 'app.mjs'), 'text/javascript; charset=utf-8']],
  ['/model.mjs', [path.join(root, 'model.mjs'), 'text/javascript; charset=utf-8']],
  ['/builder-model.mjs', [path.join(root, 'builder-model.mjs'), 'text/javascript; charset=utf-8']],
  ['/studio-ui.mjs', [path.join(root, 'studio-ui.mjs'), 'text/javascript; charset=utf-8']],
  ['/styles.css', [path.join(root, 'styles.css'), 'text/css; charset=utf-8']],
  ['/studio.css', [path.join(root, 'studio.css'), 'text/css; charset=utf-8']],
  ['/assets/logo.png', [path.join(assetRoot, 'logo.png'), 'image/png']],
  ['/assets/inter.woff2', [path.join(assetRoot, 'inter.woff2'), 'font/woff2']],
  ['/assets/fraunces.woff2', [path.join(assetRoot, 'fraunces.woff2'), 'font/woff2']],
]);

export function createPrototypeServer() {
  return createServer(async (req, res) => {
    const route = routes.get(new URL(req.url, 'http://localhost').pathname);
    if (!route || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found'); return;
    }
    try {
      const data = await readFile(route[0]);
      res.writeHead(200, {
        'Content-Type': route[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      console.error(error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Prototype asset unavailable');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const server = createPrototypeServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Contigoo Studio sample: http://127.0.0.1:${port}`));
}
