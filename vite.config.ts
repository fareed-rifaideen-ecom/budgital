import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error The shared runtime module is plain JavaScript by design.
import { handleGeminiRequest } from './server/gemini.mjs';

function publicGuidePages(): Plugin {
  return {
    name: 'budgetly-public-guide-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/learn/') || !pathname.endsWith('/')) return next();
        const filePath = path.join(process.cwd(), 'public', pathname, 'index.html');
        if (!fs.existsSync(filePath)) return next();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(fs.readFileSync(filePath));
      });
    },
  };
}

function geminiDevApi(): Plugin {
  return {
    name: 'budgetly-gemini-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini/insights', (req, res) => {
        void handleGeminiRequest(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [publicGuidePages(), react(), geminiDevApi()],
});
