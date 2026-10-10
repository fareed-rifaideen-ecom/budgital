import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleGeminiRequest } from './server/gemini.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function serve(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath);
  res.statusCode = 200;
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else if (ext === '.html') res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.end(fs.readFileSync(filePath));
  return true;
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api/gemini/insights')) return handleGeminiRequest(req, res);
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  if (requested === '/app' || requested.startsWith('/app/')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(dist, safePath === '/' ? 'index.html' : safePath);
  if (!serve(res, filePath)) {
    const nestedIndex = path.join(dist, safePath.replace(/[\/]$/, ''), 'index.html');
    if (!serve(res, nestedIndex)) {
      filePath = path.join(dist, 'index.html');
      if (!serve(res, filePath)) { res.statusCode = 404; res.end('Not found'); }
    }
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Budgital server listening on ${port}`));
