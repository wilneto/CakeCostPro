import { useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calcularPrecoUnitarioInsumo } from '@/utils/calculations';
import { formatBRL, formatNumberBR, unitLabel } from '@/utils/units';
import { Button, Card, EmptyState, Icon, Notice, SectionTitle } from '@/components/ui';

export function InsumosPage({ navigate }: { navigate: (path: string) => void }) {
  const { insumos, deleteInsumo } = useAppData();

  const items = useMemo(() => {
    return [...insumos].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [insumos]);

  return (
    <div className="page-stack">
      <Card>
        <SectionTitle
          title="Insumos"
          subtitle="Cadastre ingredientes, embalagens e custos fixos com conversões próprias."
          action={<Button onClick={() => navigate('/insumos/novo')}>Novo insumo</Button>}
        />
        {items.length ? (
          <div className="list">
            {items.map((insumo) => {
              let precoUnitario = 0;
              let erro = '';
              try {
                precoUnitario = calcularPrecoUnitarioInsumo(insumo);
              } catch (error) {
                erro = error instanceof Error ? error.message : 'Insumo sem base válida.';
              }

              return (
                <article className="list-card" key={insumo.id}>
                  <div className="list-card__main">
                    <div className="list-card__title-row">
                      <strong>{insumo.nome}</strong>
                      <span className="chip">{insumo.categoria}</span>
                    </div>
                    <div className="meta-grid">
                      <span>
                        Compra: {formatNumberBR(insumo.quantidadeComprada)} {unitLabel(insumo.unidadeCompra)}
                      </span>
                      <span>{formatBRL(insumo.precoPago)}</span>
                      <span>
                        Base: {insumo.rendimentoBase ? formatNumberBR(insumo.rendimentoBase) : 'auto'}{' '}
                        {insumo.unidadeBaseCalculada ?? 'unidade'}
                      </span>
                      <span>{insumo.conversoes.length} conversões</span>
                    </div>
                    <div className="price-line">
                      <strong>{erro ? 'Base incompleta' : `Preço base: ${formatBRL(precoUnitario)}`}</strong>
                      {!erro ? <span>por {insumo.unidadeBaseCalculada ?? 'unidade base'}</span> : null}
                    </div>
                    {erro ? <Notice tone="warning">{erro}</Notice> : null}
                    {insumo.observacoes ? <p className="muted">{insumo.observacoes}</p> : null}
                  </div>
                  <div className="list-card__actions">
                    <Button variant="secondary" onClick={() => navigate(`/insumos/${insumo.id}/editar`)}>
                      <Icon name="pencil" className="icon" />
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/insumos/${insumo.id}/conversoes`)}>
                      Conversões
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Excluir o insumo "${insumo.nome}"?`)) {
                          deleteInsumo(insumo.id);
                        }
                      }}
                    >
                      <Icon name="trash" className="icon" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sem insumos cadastrados"
            description="Comece por açúcar, farinha, ovos, leite e outros itens que você usa com frequência."
            action={<Button onClick={() => navigate('/insumos/novo')}>Cadastrar primeiro insumo</Button>}
          />
        )}
      </Card>
    </div>
  );
}
