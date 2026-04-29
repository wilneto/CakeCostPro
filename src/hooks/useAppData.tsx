import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Configuracoes, ConversaoInsumo, Insumo, Receita } from '@/types';
import { DEFAULT_CONFIGURACOES } from '@/types';
import { clearAppState, loadAppState, saveAppState } from '@/storage/appStorage';
import { gerarId } from '@/utils/ids';
import { useAuth } from '@/hooks/useAuth';

interface AppDataContextValue {
  state: AppState;
  insumos: Insumo[];
  receitas: Receita[];
  configuracoes: Configuracoes;
  isHydrated: boolean;
  addOrUpdateInsumo(insumo: Insumo): void;
  deleteInsumo(id: string): void;
  addOrUpdateConversao(insumoId: string, conversao: ConversaoInsumo): void;
  deleteConversao(insumoId: string, conversaoId: string): void;
  addOrUpdateReceita(receita: Receita): void;
  deleteReceita(id: string): void;
  updateConfiguracoes(partial: Partial<Configuracoes>): void;
  replaceState(state: AppState): void;
  clearAll(): void;
}

const initialState: AppState = {
  insumos: [],
  receitas: [],
  configuracoes: DEFAULT_CONFIGURACOES,
  updatedAt: new Date().toISOString(),
};

type Action =
  | { type: 'hydrate'; state: AppState | null }
  | { type: 'upsertInsumo'; insumo: Insumo }
  | { type: 'deleteInsumo'; id: string }
  | { type: 'upsertConversao'; insumoId: string; conversao: ConversaoInsumo }
  | { type: 'deleteConversao'; insumoId: string; conversaoId: string }
  | { type: 'upsertReceita'; receita: Receita }
  | { type: 'deleteReceita'; id: string }
  | { type: 'updateConfiguracoes'; partial: Partial<Configuracoes> }
  | { type: 'replace'; state: AppState }
  | { type: 'clear' };

function reducer(state: AppState, action: Action): AppState {
  const stamp = () => new Date().toISOString();

  switch (action.type) {
    case 'hydrate':
      return action.state ?? initialState;
    case 'upsertInsumo': {
      const exists = state.insumos.some((item) => item.id === action.insumo.id);
      const insumos = exists
        ? state.insumos.map((item) => (item.id === action.insumo.id ? { ...action.insumo, updatedAt: stamp() } : item))
        : [...state.insumos, { ...action.insumo, createdAt: action.insumo.createdAt || stamp(), updatedAt: stamp() }];
      return { ...state, insumos, updatedAt: stamp() };
    }
    case 'deleteInsumo':
      return {
        ...state,
        insumos: state.insumos.filter((item) => item.id !== action.id),
        receitas: state.receitas.map((receita) => ({
          ...receita,
          ingredientes: receita.ingredientes.filter((ingrediente) => ingrediente.insumoId !== action.id),
        })),
        updatedAt: stamp(),
      };
    case 'upsertConversao':
      return {
        ...state,
        insumos: state.insumos.map((item) =>
          item.id === action.insumoId
            ? {
                ...item,
                conversoes: (() => {
                  const exists = item.conversoes.some((conv) => conv.id === action.conversao.id);
                  if (exists) {
                    return item.conversoes.map((conv) =>
                      conv.id === action.conversao.id ? { ...action.conversao, updatedAt: stamp() } : conv
                    );
                  }
                  return [...item.conversoes, { ...action.conversao, updatedAt: stamp() }];
                })(),
                updatedAt: stamp(),
              }
            : item
        ),
        updatedAt: stamp(),
      };
    case 'deleteConversao':
      return {
        ...state,
        insumos: state.insumos.map((item) =>
          item.id === action.insumoId
            ? { ...item, conversoes: item.conversoes.filter((conv) => conv.id !== action.conversaoId), updatedAt: stamp() }
            : item
        ),
        updatedAt: stamp(),
      };
    case 'upsertReceita': {
      const exists = state.receitas.some((item) => item.id === action.receita.id);
      const receitas = exists
        ? state.receitas.map((item) => (item.id === action.receita.id ? { ...action.receita, updatedAt: stamp() } : item))
        : [...state.receitas, { ...action.receita, createdAt: action.receita.createdAt || stamp(), updatedAt: stamp() }];
      return { ...state, receitas, updatedAt: stamp() };
    }
    case 'deleteReceita':
      return { ...state, receitas: state.receitas.filter((item) => item.id !== action.id), updatedAt: stamp() };
    case 'updateConfiguracoes':
      return { ...state, configuracoes: { ...state.configuracoes, ...action.partial }, updatedAt: stamp() };
    case 'replace':
      return { ...action.state, updatedAt: stamp() };
    case 'clear':
      return { ...initialState, updatedAt: stamp() };
    default:
      return state;
  }
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      dispatch({ type: 'replace', state: initialState });
      setIsHydrated(false);
      return () => {
        cancelled = true;
      };
    }

    loadAppState(user.id)
      .then((loadedState) => {
        if (!cancelled) {
          dispatch({ type: 'replace', state: loadedState ?? initialState });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: 'replace', state: initialState });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!isHydrated || !user) {
      return;
    }

    void saveAppState(state, user.id);
  }, [isHydrated, state, user]);

  const value = useMemo<AppDataContextValue>(() => {
    return {
      state,
      insumos: state.insumos,
      receitas: state.receitas,
      configuracoes: state.configuracoes,
      isHydrated,
      addOrUpdateInsumo(insumo) {
        dispatch({ type: 'upsertInsumo', insumo });
      },
      deleteInsumo(id) {
        dispatch({ type: 'deleteInsumo', id });
      },
      addOrUpdateConversao(insumoId, conversao) {
        dispatch({ type: 'upsertConversao', insumoId, conversao: { ...conversao, id: conversao.id || gerarId('conv') } });
      },
      deleteConversao(insumoId, conversaoId) {
        dispatch({ type: 'deleteConversao', insumoId, conversaoId });
      },
      addOrUpdateReceita(receita) {
        dispatch({ type: 'upsertReceita', receita });
      },
      deleteReceita(id) {
        dispatch({ type: 'deleteReceita', id });
      },
      updateConfiguracoes(partial) {
        dispatch({ type: 'updateConfiguracoes', partial });
      },
      replaceState(stateToReplace) {
        dispatch({ type: 'replace', state: stateToReplace });
      },
      clearAll() {
        dispatch({ type: 'clear' });
        if (user) {
          void clearAppState(user.id);
        }
      },
    };
  }, [isHydrated, state, user]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData deve ser usado dentro de AppDataProvider.');
  }
  return context;
}
