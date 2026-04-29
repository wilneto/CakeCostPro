import { useEffect, useMemo, useState } from 'react';

export type AppRoute =
  | { path: '/inicio' }
  | { path: '/insumos' }
  | { path: '/insumos/novo' }
  | { path: '/insumos/:id/editar'; id: string }
  | { path: '/insumos/:id/conversoes'; id: string }
  | { path: '/receitas' }
  | { path: '/receitas/novo' }
  | { path: '/receitas/:id'; id: string }
  | { path: '/receitas/:id/editar'; id: string }
  | { path: '/calculadora' }
  | { path: '/configuracoes' }
  | { path: '/backup' };

const DEFAULT_PATH = '/inicio';

function parsePath(hash: string): string {
  const clean = hash.replace(/^#/, '').trim();
  return clean || DEFAULT_PATH;
}

function matchRoute(path: string): AppRoute {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { path: '/inicio' };
  }

  if (path === '/inicio') return { path: '/inicio' };
  if (path === '/insumos') return { path: '/insumos' };
  if (path === '/insumos/novo') return { path: '/insumos/novo' };
  if (parts[0] === 'insumos' && parts[2] === 'editar') return { path: '/insumos/:id/editar', id: parts[1] };
  if (parts[0] === 'insumos' && parts[2] === 'conversoes')
    return { path: '/insumos/:id/conversoes', id: parts[1] };
  if (path === '/receitas') return { path: '/receitas' };
  if (path === '/receitas/novo') return { path: '/receitas/novo' };
  if (parts[0] === 'receitas' && parts[2] === 'editar') return { path: '/receitas/:id/editar', id: parts[1] };
  if (parts[0] === 'receitas' && parts.length === 2) return { path: '/receitas/:id', id: parts[1] };
  if (path === '/calculadora') return { path: '/calculadora' };
  if (path === '/configuracoes') return { path: '/configuracoes' };
  if (path === '/backup') return { path: '/backup' };
  return { path: '/inicio' };
}

export function useHashRoute() {
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? DEFAULT_PATH : parsePath(window.location.hash)));

  useEffect(() => {
    const onChange = () => setHash(parsePath(window.location.hash));
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) {
      window.location.hash = DEFAULT_PATH;
    }
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const route = useMemo(() => matchRoute(hash), [hash]);
  const navigate = (path: string) => {
    window.location.hash = path;
  };

  const section = useMemo(() => {
    if (hash.startsWith('/insumos')) return 'insumos';
    if (hash.startsWith('/receitas')) return 'receitas';
    if (hash.startsWith('/calculadora')) return 'calculadora';
    if (hash.startsWith('/configuracoes') || hash.startsWith('/backup')) return 'configuracoes';
    return 'inicio';
  }, [hash]);

  return {
    route,
    path: hash,
    section,
    navigate,
  };
}
