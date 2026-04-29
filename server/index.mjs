import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const dataDir = path.join(__dirname, 'data');
const stateFile = path.join(dataDir, 'cakecost-pro-state.json');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function collectRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function isAssetRequest(urlPath) {
  return /\.[a-z0-9]+$/i.test(urlPath);
}

function getMimeType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serveStatic(req, res, urlPath) {
  const safePath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(distDir, safePath);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        'Content-Type': getMimeType(filePath),
        'Cache-Control': 'no-store',
      });
      res.end(content);
      return true;
    }
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      sendText(res, 500, 'Falha ao servir o arquivo estático.');
      return true;
    }
  }

  if (!isAssetRequest(urlPath)) {
    const indexPath = path.join(distDir, 'index.html');
    try {
      const content = await fs.readFile(indexPath);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

async function readState() {
  const payload = await readJsonFile(stateFile);
  if (!payload) {
    return null;
  }

  return payload.state ?? payload;
}

async function writeState(state) {
  const payload = {
    appName: 'CakeCost Pro',
    version: 2,
    updatedAt: state.updatedAt || new Date().toISOString(),
    state,
  };

  await writeJsonFile(stateFile, payload);
}

async function clearState() {
  await removeFile(stateFile);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const { pathname } = url;

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'cakecost-pro-backend' });
    return;
  }

  if (pathname === '/api/state') {
    try {
      if (req.method === 'GET') {
        const state = await readState();
        sendJson(res, 200, { state });
        return;
      }

      if (req.method === 'PUT') {
        const body = await collectRequestBody(req);
        const state = body?.state ?? body;

        if (!state || typeof state !== 'object') {
          sendJson(res, 400, { error: 'Estado inválido.' });
          return;
        }

        await writeState(state);
        sendJson(res, 200, { state });
        return;
      }

      if (req.method === 'DELETE') {
        await clearState();
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 405, { error: 'Método não permitido.' });
      return;
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Erro interno do servidor.' });
      return;
    }
  }

  if (req.method === 'GET') {
    const served = await serveStatic(req, res, pathname);
    if (served) {
      return;
    }
  }

  sendJson(res, 404, { error: 'Rota não encontrada.' });
});

server.listen(PORT, HOST, () => {
  console.log(`CakeCost Pro backend running at http://${HOST}:${PORT}`);
});
