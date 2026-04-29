import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calcularCustoTotalReceita } from '@/utils/calculations';
import { formatBRL, formatNumberBR, unitLabel } from '@/utils/units';
import { Button, Card, EmptyState, Icon, Notice, SectionTitle } from '@/components/ui';

export function ReceitaDetailPage({
  navigate,
  receitaId,
}: {
  navigate: (path: string) => void;
  receitaId: string;
}) {
  const { receitas, insumos, configuracoes, deleteReceita } = useAppData();
  const receita = useMemo(() => receitas.find((item) => item.id === receitaId), [receitaId, receitas]);

  if (!receita) {
    return (
      <Card>
        <EmptyState title="Receita não encontrada" description="A receita pode ter sido removida ou ainda não foi criada." action={<Button onClick={() => navigate('/receitas')}>Voltar</Button>} />
      </Card>
    );
  }

  const resultado = calcularCustoTotalReceita(receita, insumos, configuracoes);

  return (
    <div className="page-stack">
      <Card>
        <SectionTitle
          title={receita.nome}
          subtitle={receita.descricao || 'Detalhe completo da receita e da formação de preço.'}
          action={
            <div className="button-row button-row--tight">
              <Button variant="secondary" onClick={() => navigate(`/receitas/${receita.id}/editar`)}>
                <Icon name="pencil" className="icon" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Excluir a receita "${receita.nome}"?`)) {
                    deleteReceita(receita.id);
                    navigate('/receitas');
                  }
                }}
              >
                <Icon name="trash" className="icon" />
              </Button>
            </div>
          }
        />

        <div className="stat-grid stat-grid--compact">
          <div className="mini-metric">
            <span>Custo total</span>
            <strong>{formatBRL(resultado.custoTotal)}</strong>
          </div>
          <div className="mini-metric">
            <span>Custo por fatia</span>
            <strong>{formatBRL(resultado.custoPorFatia)}</strong>
          </div>
          <div className="mini-metric">
            <span>Preço sugerido</span>
            <strong>{formatBRL(resultado.precoSugerido)}</strong>
          </div>
          <div className="mini-metric">
            <span>Margem aplicada</span>
            <strong>{formatNumberBR(resultado.margemAplicada)}%</strong>
          </div>
        </div>

        {resultado.avisos.length ? <Notice tone="warning">{resultado.avisos.join(' ')}</Notice> : null}
      </Card>

      <Card>
        <SectionTitle title="Ingredientes" subtitle="Custo individual calculado a partir das conversões do insumo." />
        <div className="list">
          {resultado.itens.map((item) => (
            <div key={item.ingredienteId} className="list-row list-row--static">
              <div>
                <strong>{item.nomeInsumo}</strong>
                <span>
                  {formatNumberBR(item.quantidade)} {unitLabel(item.unidade)} · {formatNumberBR(item.quantidadeBase)} {item.unidadeBase}
                </span>
                {item.observacao ? <span>{item.observacao}</span> : null}
                {item.aviso ? <Notice tone="warning">{item.aviso}</Notice> : null}
              </div>
              <div className="list-row__side">
                <strong>{formatBRL(item.custo)}</strong>
                <span>{formatBRL(item.custoUnitarioBase)} / {item.unidadeBase}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Detalhes de custo" />
        <div className="detail-grid">
          <span>Ingredientes</span>
          <strong>{formatBRL(resultado.custoIngredientes)}</strong>
          <span>Embalagem</span>
          <strong>{formatBRL(resultado.custoEmbalagem)}</strong>
          <span>Mão de obra</span>
          <strong>{formatBRL(resultado.custoMaoDeObra)}</strong>
          <span>Forno</span>
          <strong>{formatBRL(resultado.custoForno)}</strong>
          <span>Perdas</span>
          <strong>{formatBRL(resultado.custoPerdas)}</strong>
          <span>Extras</span>
          <strong>{formatBRL(resultado.custoExtras)}</strong>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Preço sugerido" subtitle="O preço final pode seguir margem sobre custo ou markup sobre custo." />
        <div className="detail-grid">
          <span>Preço por margem</span>
          <strong>{formatBRL(resultado.precoVendaPorMargem)}</strong>
          <span>Preço por markup</span>
          <strong>{formatBRL(resultado.precoVendaPorMarkup)}</strong>
          <span>Preço por fatia</span>
          <strong>{formatBRL(resultado.precoPorFatia)}</strong>
          <span>Lucro estimado</span>
          <strong>{formatBRL(resultado.lucroEstimado)}</strong>
        </div>
      </Card>

      <div className="button-row">
        <Button onClick={() => navigate('/receitas')}>Voltar para receitas</Button>
      </div>
    </div>
  );
}
