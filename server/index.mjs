import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearAppStateForUser,
  clearAuthCookie,
  getAppStateForUser,
  getAuthProfile,
  getLegacyStateSnapshot,
  getSessionTokenFromRequest,
  initPersistence,
  loginUser,
  logoutByToken,
  registerUser,
  saveAppStateForUser,
  serializeAuthCookie,
  shutdownPersistence,
} from './store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

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

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
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

function setAuthHeaders(res, token) {
  res.setHeader('Set-Cookie', serializeAuthCookie(token));
}

function clearAuthHeaders(res) {
  res.setHeader('Set-Cookie', clearAuthCookie());
}

function parseBodyPayload(body) {
  const payload = body?.state ?? body;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Estado inválido.');
  }
  return payload;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const { pathname } = url;

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'cakecost-pro-backend' });
    return;
  }

  if (pathname === '/api/auth/me') {
    try {
      const user = await getAuthProfile(req);
      if (!user) {
        sendJson(res, 401, { error: 'Não autenticado.' });
        return;
      }

      sendJson(res, 200, { user });
      return;
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Erro interno do servidor.' });
      return;
    }
  }

  if (pathname === '/api/auth/register') {
    try {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Método não permitido.' });
        return;
      }

      const body = await collectRequestBody(req);
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      if (!email || !password) {
        sendJson(res, 400, { error: 'Informe e-mail e senha.' });
        return;
      }

      const { user, session } = await registerUser({ email, password });
      setAuthHeaders(res, session.token);
      sendJson(res, 201, { user });
      return;
    } catch (error) {
      const code = error?.code;
      const status = code === 'EMAIL_EXISTS' ? 409 : code === 'INVALID_PASSWORD' ? 400 : 500;
      sendJson(res, status, { error: error instanceof Error ? error.message : 'Erro interno do servidor.' });
      return;
    }
  }

  if (pathname === '/api/auth/login') {
    try {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Método não permitido.' });
        return;
      }

      const body = await collectRequestBody(req);
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      if (!email || !password) {
        sendJson(res, 400, { error: 'Informe e-mail e senha.' });
        return;
      }

      const { user, session } = await loginUser({ email, password });
      setAuthHeaders(res, session.token);
      sendJson(res, 200, { user });
      return;
    } catch (error) {
      const code = error?.code;
      const status = code === 'INVALID_CREDENTIALS' ? 401 : 500;
      sendJson(res, status, { error: error instanceof Error ? error.message : 'Erro interno do servidor.' });
      return;
    }
  }

  if (pathname === '/api/auth/logout') {
    try {
      const token = getSessionTokenFromRequest(req);
      await logoutByToken(token);
      clearAuthHeaders(res);
      sendJson(res, 200, { ok: true });
      return;
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Erro interno do servidor.' });
      return;
    }
  }

  if (pathname === '/api/state') {
    try {
      const user = await getAuthProfile(req);
      if (!user) {
        sendJson(res, 401, { error: 'Não autenticado.' });
        return;
      }

      if (req.method === 'GET') {
        const state = await getAppStateForUser(user.id);
        sendJson(res, 200, { state });
        return;
      }

      if (req.method === 'PUT') {
        const body = await collectRequestBody(req);
        const state = parseBodyPayload(body);
        await saveAppStateForUser(user.id, state);
        sendJson(res, 200, { state });
        return;
      }

      if (req.method === 'DELETE') {
        await clearAppStateForUser(user.id);
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

async function start() {
  await initPersistence();

  server.listen(PORT, HOST, () => {
    console.log(`CakeCost Pro backend running at http://${HOST}:${PORT}`);
  });
}

start().catch(async (error) => {
  console.error('Falha ao iniciar o backend:', error);
  await shutdownPersistence().catch(() => {});
  process.exit(1);
});
