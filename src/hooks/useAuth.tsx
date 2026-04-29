import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function requestAuth(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => ({}))) as { user?: AuthUser; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível concluir a autenticação.');
  }

  return payload.user ?? null;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Não foi possível verificar a sessão.');
  }

  const payload = (await response.json()) as { user?: AuthUser };
  return payload.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao verificar login.');
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      isLoading,
      error,
      async login(email, password) {
        setError(null);
        setIsLoading(true);
        try {
          const currentUser = await requestAuth('/api/auth/login', { email, password });
          setUser(currentUser);
          await refresh();
        } catch (err) {
          setUser(null);
          setError(err instanceof Error ? err.message : 'Falha ao entrar.');
          throw err;
        } finally {
          setIsLoading(false);
          setIsReady(true);
        }
      },
      async register(email, password) {
        setError(null);
        setIsLoading(true);
        try {
          const currentUser = await requestAuth('/api/auth/register', { email, password });
          setUser(currentUser);
          await refresh();
        } catch (err) {
          setUser(null);
          setError(err instanceof Error ? err.message : 'Falha ao cadastrar.');
          throw err;
        } finally {
          setIsLoading(false);
          setIsReady(true);
        }
      },
      async logout() {
        setIsLoading(true);
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
            credentials: 'include',
          });
          setUser(null);
        } finally {
          setIsLoading(false);
          setIsReady(true);
        }
      },
      refresh,
    }),
    [error, isLoading, isReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return context;
}
