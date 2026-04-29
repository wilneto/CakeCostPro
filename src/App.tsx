import React, { useEffect } from 'react';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { useHashRoute } from '@/hooks/useHashRoute';
import { AppShell, Button, Card, Icon, Notice } from '@/components/ui';
import { DashboardPage } from '@/pages/DashboardPage';
import { InsumosPage } from '@/pages/InsumosPage';
import { InsumoFormPage } from '@/pages/InsumoFormPage';
import { InsumoConversoesPage } from '@/pages/InsumoConversoesPage';
import { ReceitasPage } from '@/pages/ReceitasPage';
import { ReceitaFormPage } from '@/pages/ReceitaFormPage';
import { ReceitaDetailPage } from '@/pages/ReceitaDetailPage';
import { CalculadoraPage } from '@/pages/CalculadoraPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { BackupPage } from '@/pages/BackupPage';

function ScreenError({ error }: { error: Error }) {
  return (
    <div className="error-screen">
      <Card>
        <Notice tone="danger">O app encontrou um erro inesperado, mas seus dados locais continuam salvos.</Notice>
        <h2>Não foi possível abrir esta tela</h2>
        <p>{error.message}</p>
        <div className="button-row">
          <Button onClick={() => (window.location.hash = '/inicio')}>Voltar ao início</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      </Card>
    </div>
  );
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ScreenError error={this.state.error} />;
    }

    return this.props.children;
  }
}

function AppContent() {
  const { route, navigate, section } = useHashRoute();
  const { receitas, insumos, isHydrated } = useAppData();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.path]);

  useEffect(() => {
    document.title = 'CakeCost Pro';
  }, []);

  if (!isHydrated) {
    return (
      <div className="error-screen">
        <Card>
          <Notice tone="info">Carregando dados salvos no IndexedDB...</Notice>
          <h2>CakeCost Pro</h2>
          <p>Estamos migrando e lendo seus dados locais com segurança. Aguarde um instante.</p>
        </Card>
      </div>
    );
  }

  return (
    <AppShell route={route}>
      <div className="app-topbar">
        <div className="app-topbar__brand">
          <Icon name="cake" className="icon" />
          <div>
            <strong>CakeCost Pro</strong>
            <span>mobile-first · offline · BRL</span>
          </div>
        </div>
        <div className="app-topbar__status">
          <span className={`status-dot status-dot--${section}`} />
          <span>{receitas.length} receitas · {insumos.length} insumos</span>
        </div>
      </div>

      {route.path === '/inicio' && <DashboardPage navigate={navigate} />}
      {route.path === '/insumos' && <InsumosPage navigate={navigate} />}
      {route.path === '/insumos/novo' && <InsumoFormPage navigate={navigate} />}
      {route.path === '/insumos/:id/editar' && <InsumoFormPage navigate={navigate} insumoId={route.id} />}
      {route.path === '/insumos/:id/conversoes' && <InsumoConversoesPage navigate={navigate} insumoId={route.id} />}
      {route.path === '/receitas' && <ReceitasPage navigate={navigate} />}
      {route.path === '/receitas/novo' && <ReceitaFormPage navigate={navigate} />}
      {route.path === '/receitas/:id/editar' && <ReceitaFormPage navigate={navigate} receitaId={route.id} />}
      {route.path === '/receitas/:id' && <ReceitaDetailPage navigate={navigate} receitaId={route.id} />}
      {route.path === '/calculadora' && <CalculadoraPage navigate={navigate} />}
      {route.path === '/configuracoes' && <ConfiguracoesPage navigate={navigate} />}
      {route.path === '/backup' && <BackupPage navigate={navigate} />}

      <Card className="footer-note">
        <p>
          Dados salvos localmente no dispositivo via IndexedDB, com importação automática de dados antigos se
          necessário.
        </p>
      </Card>
    </AppShell>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </AppErrorBoundary>
  );
}
