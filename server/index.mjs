import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const dataDir = path.join(__dirname, 'data');
const stateFile = path.join(dataDir, 'cakecost-pro-state.json');
const databaseUrl = process.env.DATABASE_URL?.trim() || '';
const hasPostgresConfig = Boolean(
  databaseUrl || process.env.PGHOST || process.env.PGDATABASE || process.env.PGUSER || process.env.PGPORT
);
const stateTable = 'cakecost_state';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const pool = hasPostgresConfig
  ? new Pool(
      databaseUrl
        ? {
            connectionString: databaseUrl,
          }
        : undefined
    )
  : null;

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

async function queryDb(text, params = []) {
  if (!pool) {
    throw new Error('PostgreSQL indisponível.');
  }

  return pool.query(text, params);
}

async function initDatabase() {
  if (!pool) {
    return;
  }

  await queryDb(`
    CREATE TABLE IF NOT EXISTS ${stateTable} (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      app_name TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      state JSONB NOT NULL
    )
  `);
}

async function readStateFromPostgres() {
  if (!pool) {
    return null;
  }

  const result = await queryDb(`SELECT state FROM ${stateTable} WHERE id = 1 LIMIT 1`);
  return result.rows[0]?.state ?? null;
}

async function writeStateToPostgres(state) {
  if (!pool) {
    throw new Error('PostgreSQL indisponível.');
  }

  const updatedAt = state.updatedAt || new Date().toISOString();
  await queryDb(
    `
      INSERT INTO ${stateTable} (id, app_name, version, updated_at, state)
      VALUES (1, $1, $2, $3, $4::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        app_name = EXCLUDED.app_name,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at,
        state = EXCLUDED.state
    `,
    ['CakeCost Pro', 2, updatedAt, JSON.stringify({ ...state, updatedAt })]
  );
}

async function clearStateFromPostgres() {
  if (!pool) {
    return;
  }

  await queryDb(`DELETE FROM ${stateTable} WHERE id = 1`);
}

async function migrateLegacyFileToPostgresIfNeeded() {
  if (!pool) {
    return;
  }

  const existing = await readStateFromPostgres();
  if (existing) {
    return;
  }

  const legacy = await readJsonFile(stateFile);
  if (!legacy) {
    return;
  }

  const state = legacy.state ?? legacy;
  if (!state || typeof state !== 'object') {
    return;
  }

  await writeStateToPostgres(state);
  await removeFile(stateFile);
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
  if (pool) {
    await migrateLegacyFileToPostgresIfNeeded();
    return readStateFromPostgres();
  }

  const payload = await readJsonFile(stateFile);
  if (!payload) {
    return null;
  }

  return payload.state ?? payload;
}

async function writeState(state) {
  if (pool) {
    await writeStateToPostgres(state);
    return;
  }

  const payload = {
    appName: 'CakeCost Pro',
    version: 2,
    updatedAt: state.updatedAt || new Date().toISOString(),
    state,
  };

  await writeJsonFile(stateFile, payload);
}

async function clearState() {
  if (pool) {
    await clearStateFromPostgres();
    await removeFile(stateFile);
    return;
  }

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

async function start() {
  if (pool) {
    await initDatabase();
  }

  server.listen(PORT, HOST, () => {
    const backendType = pool ? 'PostgreSQL' : 'arquivo local';
    console.log(`CakeCost Pro backend running at http://${HOST}:${PORT} (${backendType})`);
  });
}

start().catch(async (error) => {
  console.error('Falha ao iniciar o backend:', error);
  try {
    await pool?.end();
  } catch {
    // ignora
  }
  process.exit(1);
});
