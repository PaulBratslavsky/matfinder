// The exported web build (dist/) served like Vercel will serve it: static files first, `/api/*` proxied to Strapi
// (same origin, so the auth cookie is first-party), and every other path falls back to index.html.
//   node e2e/serve.mjs <port> <strapi origin>
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.argv[2] ?? 8084);
const api = new URL(process.argv[3] ?? 'http://localhost:1342');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    const upstream = request(
      { host: api.hostname, port: api.port, path: req.url, method: req.method, headers: { ...req.headers, host: api.host } },
      (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      },
    );
    upstream.on('error', (e) => res.writeHead(502).end(String(e)));
    req.pipe(upstream);
    return;
  }
  let file = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0]));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${root} on :${port}, /api -> ${api.origin}`));
