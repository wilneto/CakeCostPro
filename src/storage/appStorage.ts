import type { AppState, BackupPayload } from '@/types';

const DB_NAME = 'cakecost-pro-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';
const STORAGE_KEY = 'cakecost-pro-state-v1';
const RECORD_KEY = 'state';
const REMOTE_ENDPOINT = '/api/state';

export interface StorageAdapter {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}

function parseTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function supportsIndexedDb(): boolean {
  return isBrowser() && 'indexedDB' in window;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
      reject(new Error('IndexedDB indisponível.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB.'));
  });
}

async function getFromIndexedDb(): Promise<AppState | null> {
  if (!supportsIndexedDb()) {
    return null;
  }

  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(RECORD_KEY);

      request.onsuccess = () => {
        const value = request.result as AppState | undefined;
        resolve(value ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Falha ao ler do IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

async function setInIndexedDb(state: AppState): Promise<void> {
  if (!supportsIndexedDb()) {
    throw new Error('IndexedDB indisponível.');
  }

  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(state, RECORD_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Falha ao salvar no IndexedDB.'));
      tx.onerror = () => reject(tx.error ?? new Error('Falha na transação do IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

async function clearIndexedDb(): Promise<void> {
  if (!supportsIndexedDb()) {
    return;
  }

  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(RECORD_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Falha ao limpar IndexedDB.'));
      tx.onerror = () => reject(tx.error ?? new Error('Falha na transação do IndexedDB.'));
    });
  } finally {
    db.close();
  }
}

function getFromLocalStorage(): AppState | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

function setInLocalStorage(state: AppState): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearLocalStorage(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

async function getFromApi(): Promise<AppState | null> {
  if (!isBrowser()) {
    return null;
  }

  const response = await fetch(REMOTE_ENDPOINT, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { state?: AppState | null };
  return payload?.state ?? null;
}

async function setToApi(state: AppState): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  const response = await fetch(REMOTE_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    throw new Error('Falha ao salvar no backend.');
  }
}

async function clearApi(): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  const response = await fetch(REMOTE_ENDPOINT, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Falha ao limpar o backend.');
  }
}

function pickLatestState(localState: AppState | null, remoteState: AppState | null): AppState | null {
  if (!localState && !remoteState) {
    return null;
  }

  if (!localState) {
    return remoteState;
  }

  if (!remoteState) {
    return localState;
  }

  return parseTimestamp(remoteState.updatedAt) > parseTimestamp(localState.updatedAt) ? remoteState : localState;
}

export const appStorage: StorageAdapter = {
  async load() {
    const [indexedState, legacyState, remoteState] = await Promise.all([
      getFromIndexedDb().catch(() => null),
      Promise.resolve(getFromLocalStorage()),
      getFromApi().catch(() => null),
    ]);

    const latestLocal = pickLatestState(indexedState, legacyState);
    const latest = pickLatestState(latestLocal, remoteState);

    if (latest) {
      if (latest !== indexedState) {
        await setInIndexedDb(latest).catch(() => {
          // Mantém o app funcionando mesmo se o IndexedDB falhar.
        });
      }

      if (latest !== remoteState) {
        await setToApi(latest).catch(() => {
          // Offline ou backend indisponível: o cache local continua preservado.
        });
      }
    }

    return latest;
  },
  async save(state) {
    await setInIndexedDb(state).catch(() => {
      setInLocalStorage(state);
    });

    try {
      await setToApi(state);
      clearLocalStorage();
    } catch {
      setInLocalStorage(state);
    }
  },
  async clear() {
    await clearIndexedDb().catch(() => {
      // Sem quebra: se IndexedDB falhar, limpamos o fallback legado.
    });
    clearLocalStorage();
    await clearApi().catch(() => {
      // Se o backend não responder, a limpeza local ainda é concluída.
    });
  },
};

export async function loadAppState(): Promise<AppState | null> {
  return appStorage.load();
}

export async function saveAppState(state: AppState): Promise<void> {
  await appStorage.save(state);
}

export async function clearAppState(): Promise<void> {
  await appStorage.clear();
}

export function exportBackup(state: AppState): BackupPayload {
  return {
    appName: 'CakeCost Pro',
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
  };
}

export function readBackupPayload(json: string): BackupPayload {
  const parsed = JSON.parse(json) as BackupPayload;
  if (!parsed || typeof parsed !== 'object' || !parsed.state) {
    throw new Error('Arquivo de backup inválido.');
  }
  return parsed;
}
