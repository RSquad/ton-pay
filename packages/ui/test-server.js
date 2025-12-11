import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 8000;
const BASE_DIR = resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    if (filePath === '/') {
      filePath = '/test/index.html';
    }

    if (filePath.startsWith('/test/')) {
      filePath = join(BASE_DIR, filePath);
    } else if (filePath.startsWith('/dist/')) {
      filePath = join(BASE_DIR, filePath);
    } else if (filePath.startsWith('/src/')) {
      filePath = join(BASE_DIR, filePath);
    } else {
      filePath = join(BASE_DIR, filePath);
    }

    if (!existsSync(filePath)) {
      return new Response('404 Not Found', { status: 404 });
    }

    const stat = statSync(filePath);
    if (!stat.isFile()) {
      return new Response('404 Not Found', { status: 404 });
    }

    try {
      const content = readFileSync(filePath);
      const mimeType = getMimeType(filePath);
      return new Response(content, {
        headers: {
          'Content-Type': mimeType,
        },
      });
    } catch (error) {
      console.error('Error serving file:', error);
      return new Response('500 Internal Server Error', { status: 500 });
    }
  },
});

console.log(`Server running at http://localhost:${PORT}/`);
console.log(`Test page: http://localhost:${PORT}/test/index.html`);
