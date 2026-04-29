import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const legacyStateFile = path.join(__dirname, 'data', 'cakecost-pro-state.json');
const authStoreFile = path.join(__dirname, 'data', 'cakecost-pro-auth-store.json');

const databaseUrl = process.env.DATABASE_URL?.trim() || '';
const hasPostgresConfig = Boolean(
  databaseUrl || process.env.PGHOST || process.env.PGDATABASE || process.env.PGUSER || process.env.PGPORT
);

const pool = hasPostgresConfig
  ? new Pool(
      databaseUrl
        ? {
            connectionString: databaseUrl,
          }
        : undefined
    )
  : null;

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const USERS_TABLE = 'cakecost_users';
const SESSIONS_TABLE = 'cakecost_sessions';
const STATES_TABLE = 'cakecost_user_states';
const LEGACY_TABLE = 'cakecost_state';

const FILE_DEFAULT = {
  users: [],
  sessions: [],
  states: {},
  legacyState: null,
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = hashPassword(password, salt).hash;
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
}

export function getSessionTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies.cakecost_session || null;
}

export function serializeAuthCookie(token) {
  const parts = [
    `cakecost_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_MS / 1000}`,
  ];
  return parts.join('; ');
}

export function clearAuthCookie() {
  return 'cakecost_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

async function readJson(filePath) {
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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function readFileStore() {
  const payload = await readJson(authStoreFile);
  if (payload && typeof payload === 'object') {
    return {
      users: Array.isArray(payload.users) ? payload.users : [],
      sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
      states: payload.states && typeof payload.states === 'object' ? payload.states : {},
      legacyState: payload.legacyState ?? null,
    };
  }

  const legacyPayload = await readJson(legacyStateFile);
  return {
    ...FILE_DEFAULT,
    legacyState: legacyPayload?.state ?? legacyPayload ?? null,
  };
}

async function writeFileStore(store) {
  await writeJson(authStoreFile, store);
}

async function readLegacyStateFromFile() {
  const store = await readFileStore();
  return store.legacyState || null;
}

async function clearLegacyStateFile() {
  const store = await readFileStore();
  store.legacyState = null;
  await writeFileStore(store);
  try {
    await fs.unlink(legacyStateFile);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function initPostgres() {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SESSIONS_TABLE} (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${STATES_TABLE} (
      user_id TEXT PRIMARY KEY REFERENCES ${USERS_TABLE}(id) ON DELETE CASCADE,
      app_name TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      state JSONB NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${LEGACY_TABLE} (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      app_name TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      state JSONB NOT NULL
    )
  `);
}

function sessionExpiryIso() {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

async function createUserInDb(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await pool.query(`SELECT id FROM ${USERS_TABLE} WHERE email = $1 LIMIT 1`, [normalizedEmail]);
  if (existing.rows.length) {
    const error = new Error('E-mail já cadastrado.');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const userId = randomUUID();
  const { salt, hash } = hashPassword(password);
  const createdAt = nowIso();

  await pool.query(
    `INSERT INTO ${USERS_TABLE} (id, email, password_salt, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [userId, normalizedEmail, salt, hash, createdAt]
  );

  return { id: userId, email: normalizedEmail, createdAt };
}

async function createUserInFile(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const store = await readFileStore();
  if (store.users.some((item) => item.email === normalizedEmail)) {
    const error = new Error('E-mail já cadastrado.');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const user = { id: randomUUID(), email: normalizedEmail, createdAt: nowIso() };
  const { salt, hash } = hashPassword(password);
  store.users.push({
    ...user,
    passwordSalt: salt,
    passwordHash: hash,
  });
  await writeFileStore(store);
  return user;
}

async function findUserByEmailInDb(email) {
  const normalizedEmail = normalizeEmail(email);
  const result = await pool.query(
    `SELECT id, email, password_salt AS "passwordSalt", password_hash AS "passwordHash", created_at AS "createdAt" FROM ${USERS_TABLE} WHERE email = $1 LIMIT 1`,
    [normalizedEmail]
  );
  return result.rows[0] || null;
}

async function findUserByEmailInFile(email) {
  const normalizedEmail = normalizeEmail(email);
  const store = await readFileStore();
  return store.users.find((item) => item.email === normalizedEmail) || null;
}

async function findUserByIdInDb(id) {
  const result = await pool.query(
    `SELECT id, email, password_salt AS "passwordSalt", password_hash AS "passwordHash", created_at AS "createdAt" FROM ${USERS_TABLE} WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findUserByIdInFile(id) {
  const store = await readFileStore();
  return store.users.find((item) => item.id === id) || null;
}

async function createSessionForUserInDb(userId) {
  const token = generateToken();
  const createdAt = nowIso();
  const expiresAt = sessionExpiryIso();

  await pool.query(
    `INSERT INTO ${SESSIONS_TABLE} (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)`,
    [token, userId, createdAt, expiresAt]
  );

  return { token, createdAt, expiresAt };
}

async function createSessionForUserInFile(userId) {
  const token = generateToken();
  const createdAt = nowIso();
  const expiresAt = sessionExpiryIso();
  const store = await readFileStore();
  store.sessions = store.sessions.filter((item) => item.expiresAt > createdAt);
  store.sessions.push({ token, userId, createdAt, expiresAt });
  await writeFileStore(store);
  return { token, createdAt, expiresAt };
}

async function getSessionFromTokenInDb(token) {
  const result = await pool.query(
    `SELECT token, user_id AS "userId", created_at AS "createdAt", expires_at AS "expiresAt" FROM ${SESSIONS_TABLE} WHERE token = $1 LIMIT 1`,
    [token]
  );
  const session = result.rows[0] || null;
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await pool.query(`DELETE FROM ${SESSIONS_TABLE} WHERE token = $1`, [token]);
    return null;
  }

  return session;
}

async function getSessionFromTokenInFile(token) {
  const store = await readFileStore();
  const session = store.sessions.find((item) => item.token === token) || null;
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    store.sessions = store.sessions.filter((item) => item.token !== token);
    await writeFileStore(store);
    return null;
  }

  return session;
}

async function deleteSessionInDb(token) {
  await pool.query(`DELETE FROM ${SESSIONS_TABLE} WHERE token = $1`, [token]);
}

async function deleteSessionInFile(token) {
  const store = await readFileStore();
  store.sessions = store.sessions.filter((item) => item.token !== token);
  await writeFileStore(store);
}

async function readLegacyStateFromDb() {
  const result = await pool.query(`SELECT state FROM ${LEGACY_TABLE} WHERE id = 1 LIMIT 1`);
  return result.rows[0]?.state ?? null;
}

async function clearLegacyStateInDb() {
  await pool.query(`DELETE FROM ${LEGACY_TABLE} WHERE id = 1`);
}

async function readUserStateInDb(userId) {
  const result = await pool.query(`SELECT state FROM ${STATES_TABLE} WHERE user_id = $1 LIMIT 1`, [userId]);
  return result.rows[0]?.state ?? null;
}

async function writeUserStateInDb(userId, state) {
  const updatedAt = state.updatedAt || nowIso();
  await pool.query(
    `
      INSERT INTO ${STATES_TABLE} (user_id, app_name, version, updated_at, state)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET
        app_name = EXCLUDED.app_name,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at,
        state = EXCLUDED.state
    `,
    [userId, 'CakeCost Pro', 2, updatedAt, JSON.stringify({ ...state, updatedAt })]
  );
}

async function clearUserStateInDb(userId) {
  await pool.query(`DELETE FROM ${STATES_TABLE} WHERE user_id = $1`, [userId]);
}

async function claimLegacyStateForUserInDb(userId) {
  const existing = await readUserStateInDb(userId);
  if (existing) {
    return existing;
  }

  const legacy = await readLegacyStateFromDb();
  if (!legacy) {
    return null;
  }

  await writeUserStateInDb(userId, legacy);
  await clearLegacyStateInDb();
  return legacy;
}

async function readUserStateInFile(userId) {
  const store = await readFileStore();
  const existing = store.states[userId] || null;
  if (existing) {
    return existing;
  }

  if (!store.legacyState) {
    return null;
  }

  store.states[userId] = store.legacyState;
  store.legacyState = null;
  await writeFileStore(store);
  return store.states[userId];
}

async function writeUserStateInFile(userId, state) {
  const store = await readFileStore();
  store.states[userId] = state;
  await writeFileStore(store);
}

async function clearUserStateInFile(userId) {
  const store = await readFileStore();
  delete store.states[userId];
  await writeFileStore(store);
}

export async function initPersistence() {
  if (pool) {
    await initPostgres();
    return;
  }

  await readFileStore();
}

export async function registerUser({ email, password }) {
  if (password.length < 6) {
    const error = new Error('A senha precisa ter pelo menos 6 caracteres.');
    error.code = 'INVALID_PASSWORD';
    throw error;
  }

  const user = pool ? await createUserInDb(email, password) : await createUserInFile(email, password);
  const session = pool ? await createSessionForUserInDb(user.id) : await createSessionForUserInFile(user.id);

  return { user, session };
}

export async function loginUser({ email, password }) {
  const user = pool ? await findUserByEmailInDb(email) : await findUserByEmailInFile(email);
  if (!user) {
    const error = new Error('E-mail ou senha inválidos.');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    const error = new Error('E-mail ou senha inválidos.');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const session = pool ? await createSessionForUserInDb(user.id) : await createSessionForUserInFile(user.id);
  return { user: { id: user.id, email: user.email, createdAt: user.createdAt }, session };
}

export async function logoutByToken(token) {
  if (!token) {
    return;
  }

  if (pool) {
    await deleteSessionInDb(token);
    return;
  }

  await deleteSessionInFile(token);
}

export async function getUserFromToken(token) {
  if (!token) {
    return null;
  }

  const session = pool ? await getSessionFromTokenInDb(token) : await getSessionFromTokenInFile(token);
  if (!session) {
    return null;
  }

  const user = pool ? await findUserByIdInDb(session.userId) : await findUserByIdInFile(session.userId);
  if (!user) {
    return null;
  }

  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export async function getUserFromRequest(req) {
  const token = getSessionTokenFromRequest(req);
  return getUserFromToken(token);
}

export async function getAppStateForUser(userId) {
  if (!userId) {
    return null;
  }

  if (pool) {
    return claimLegacyStateForUserInDb(userId);
  }

  return readUserStateInFile(userId);
}

export async function saveAppStateForUser(userId, state) {
  if (!userId) {
    throw new Error('Usuário não autenticado.');
  }

  if (pool) {
    await writeUserStateInDb(userId, state);
    return;
  }

  await writeUserStateInFile(userId, state);
}

export async function clearAppStateForUser(userId) {
  if (!userId) {
    return;
  }

  if (pool) {
    await clearUserStateInDb(userId);
    return;
  }

  await clearUserStateInFile(userId);
}

export async function getAuthProfile(req) {
  return getUserFromRequest(req);
}

export async function getLegacyStateSnapshot() {
  return pool ? readLegacyStateFromDb() : readLegacyStateFromFile();
}

export async function shutdownPersistence() {
  if (pool) {
    await pool.end();
  }
}
