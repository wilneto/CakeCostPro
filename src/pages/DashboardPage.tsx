import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import type { Receita } from '@/types';
import { calcularCustoTotalReceita } from '@/utils/calculations';
import { formatBRL, formatNumberBR } from '@/utils/units';
import { Button, Card, EmptyState, Icon, SectionTitle, StatCard } from '@/components/ui';

export function DashboardPage({ navigate }: { navigate: (path: string) => void }) {
  const { insumos, receitas, configuracoes } = useAppData();

  const resumo = useMemo(() => {
    const receitaCalculada = receitas
      .map((receita) => {
        try {
          return { receita, custo: calcularCustoTotalReceita(receita, insumos, configuracoes) };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as { receita: Receita; custo: ReturnType<typeof calcularCustoTotalReceita> }[];

    const ultimo = [...receitas].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const ultimoCusto = ultimo ? receitaCalculada.find((item) => item.receita.id === ultimo.id)?.custo : null;

    return {
      media: receitaCalculada.length
        ? receitaCalculada.reduce((acc, item) => acc + item.custo.custoTotal, 0) / receitaCalculada.length
        : 0,
      ultimo,
      ultimoCusto,
      receitaCalculada,
    };
  }, [insumos, receitas, configuracoes]);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-card__copy">
          <div className="brand-pill">
            <Icon name="spark" className="icon" />
            <span>CakeCost Pro</span>
          </div>
          <h1>Controle o custo real de cada bolo com clareza no celular.</h1>
          <p>
            Cadastre insumos, converta medidas culinárias, some custos indiretos e encontre um preço de venda seguro
            em poucos toques.
          </p>
        </div>
        <div className="hero-card__actions">
          <Button onClick={() => navigate('/receitas/novo')}>Nova receita</Button>
          <Button variant="secondary" onClick={() => navigate('/insumos/novo')}>
            Novo insumo
          </Button>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard label="Insumos cadastrados" value={formatNumberBR(insumos.length, 0)} icon={<Icon name="flour" className="icon" />} />
        <StatCard label="Receitas cadastradas" value={formatNumberBR(receitas.length, 0)} icon={<Icon name="cake" className="icon" />} />
        <StatCard label="Custo médio das receitas" value={formatBRL(resumo.media)} icon={<Icon name="receipt" className="icon" />} />
        <StatCard
          label="Última receita calculada"
          value={resumo.ultimo ? resumo.ultimo.nome : 'Nenhuma ainda'}
          meta={resumo.ultimoCusto ? `${formatBRL(resumo.ultimoCusto.custoTotal)} no total` : 'Calcule uma receita para ver aqui'}
          icon={<Icon name="spark" className="icon" />}
        />
      </div>

      <Card>
        <SectionTitle
          title="Atalhos rápidos"
          subtitle="Use os principais fluxos sem sair da tela inicial."
        />
        <div className="button-row">
          <Button onClick={() => navigate('/insumos')}>Ver insumos</Button>
          <Button variant="secondary" onClick={() => navigate('/receitas')}>
            Ver receitas
          </Button>
          <Button variant="ghost" onClick={() => navigate('/calculadora')}>
            Calculadora
          </Button>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Resumo das receitas" subtitle="Os valores são recalculados com os insumos salvos localmente." />
        {resumo.receitaCalculada.length ? (
          <div className="list">
            {resumo.receitaCalculada.slice(0, 4).map(({ receita, custo }) => (
              <button key={receita.id} className="list-row list-row--interactive" onClick={() => navigate(`/receitas/${receita.id}`)}>
                <div>
                  <strong>{receita.nome}</strong>
                  <span>{receita.quantidadeFatias} fatias · {formatBRL(custo.custoPorFatia)} por fatia</span>
                </div>
                <div className="list-row__side">
                  <strong>{formatBRL(custo.custoTotal)}</strong>
                  <span>{formatBRL(custo.precoSugerido)} sugerido</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem receitas calculadas ainda"
            description="Crie sua primeira receita para começar a ver custo médio, preço sugerido e lucro estimado."
            action={<Button onClick={() => navigate('/receitas/novo')}>Criar receita</Button>}
          />
        )}
      </Card>
    </div>
  );
}
