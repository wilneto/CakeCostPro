import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calcularCustoTotalReceita } from '@/utils/calculations';
import { formatBRL } from '@/utils/units';
import { Button, Card, EmptyState, Icon, Notice, SectionTitle } from '@/components/ui';

export function ReceitasPage({ navigate }: { navigate: (path: string) => void }) {
  const { receitas, insumos, configuracoes, deleteReceita } = useAppData();

  const items = useMemo(() => {
    return [...receitas]
      .map((receita) => {
        try {
          return { receita, custo: calcularCustoTotalReceita(receita, insumos, configuracoes) };
        } catch (error) {
          return {
            receita,
            custo: null,
            erro: error instanceof Error ? error.message : 'Erro ao calcular receita.',
          };
        }
      })
      .sort((a, b) => a.receita.nome.localeCompare(b.receita.nome));
  }, [receitas, insumos, configuracoes]);

  return (
    <Card>
      <SectionTitle
        title="Receitas"
        subtitle="Organize suas receitas e veja o custo total já com embalagem, forno, mão de obra e perdas."
        action={<Button onClick={() => navigate('/receitas/novo')}>Nova receita</Button>}
      />

      {items.length ? (
        <div className="list">
          {items.map((item) => (
            <article className="list-card" key={item.receita.id}>
              <div className="list-card__main">
                <div className="list-card__title-row">
                  <strong>{item.receita.nome}</strong>
                  <span className="chip">{item.receita.quantidadeFatias} fatias</span>
                </div>
                <div className="meta-grid">
                  <span>{item.receita.ingredientes.length} ingredientes</span>
                  <span>{item.receita.tempoPreparoMin} min preparo</span>
                  <span>{item.receita.tempoFornoMin} min forno</span>
                  <span>{item.receita.tipoForno}</span>
                </div>
                {item.custo ? (
                  <div className="price-line">
                    <strong>{formatBRL(item.custo.custoTotal)}</strong>
                    <span>{formatBRL(item.custo.precoSugerido)} sugerido</span>
                  </div>
                ) : null}
                {item.erro ? <Notice tone="warning">{item.erro}</Notice> : null}
              </div>
              <div className="list-card__actions">
                <Button variant="secondary" onClick={() => navigate(`/receitas/${item.receita.id}`)}>
                  Detalhe
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/receitas/${item.receita.id}/editar`)}>
                  <Icon name="pencil" className="icon" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(`Excluir a receita "${item.receita.nome}"?`)) {
                      deleteReceita(item.receita.id);
                    }
                  }}
                >
                  <Icon name="trash" className="icon" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sem receitas cadastradas"
          description="Crie uma receita com ingredientes, tempos e custos para enxergar o preço de venda recomendado."
          action={<Button onClick={() => navigate('/receitas/novo')}>Criar receita</Button>}
        />
      )}
    </Card>
  );
}
