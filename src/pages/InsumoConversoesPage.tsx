import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import type { ConversaoInsumo, Insumo, RecipeUnit } from '@/types';
import { gerarId } from '@/utils/ids';
import { parsePtNumber, unitLabel } from '@/utils/units';
import { Button, Card, EmptyState, Icon, Notice, SectionTitle, SelectField, TextAreaField, TextField } from '@/components/ui';

interface ConversaoFormState {
  id?: string;
  unidadeOrigem: RecipeUnit;
  quantidadeOrigem: string;
  unidadeDestino: ConversaoInsumo['unidadeDestino'];
  quantidadeDestino: string;
  observacoes: string;
}

function emptyForm(): ConversaoFormState {
  return {
    unidadeOrigem: 'xicara',
    quantidadeOrigem: '1',
    unidadeDestino: 'g',
    quantidadeDestino: '200',
    observacoes: '',
  };
}

export function InsumoConversoesPage({
  navigate,
  insumoId,
}: {
  navigate: (path: string) => void;
  insumoId: string;
}) {
  const { insumos, addOrUpdateConversao, deleteConversao } = useAppData();
  const insumo = useMemo(() => insumos.find((item) => item.id === insumoId), [insumoId, insumos]);
  const [form, setForm] = useState<ConversaoFormState>(emptyForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!insumo) {
      return;
    }
    if (form.id) {
      const existing = insumo.conversoes.find((item) => item.id === form.id);
      if (existing) {
        setForm({
          id: existing.id,
          unidadeOrigem: existing.unidadeOrigem,
          quantidadeOrigem: String(existing.quantidadeOrigem),
          unidadeDestino: existing.unidadeDestino,
          quantidadeDestino: String(existing.quantidadeDestino),
          observacoes: existing.observacoes ?? '',
        });
      }
    }
  }, [form.id, insumo]);

  if (!insumo) {
    return (
      <Card>
        <Notice tone="danger">Insumo não encontrado.</Notice>
        <div className="button-row">
          <Button onClick={() => navigate('/insumos')}>Voltar para insumos</Button>
        </div>
      </Card>
    );
  }

  const onEdit = (conversao: ConversaoInsumo) => {
    setForm({
      id: conversao.id,
      unidadeOrigem: conversao.unidadeOrigem,
      quantidadeOrigem: String(conversao.quantidadeOrigem),
      unidadeDestino: conversao.unidadeDestino,
      quantidadeDestino: String(conversao.quantidadeDestino),
      observacoes: conversao.observacoes ?? '',
    });
  };

  return (
    <Card>
      <SectionTitle
        title={`Conversões de ${insumo.nome}`}
        subtitle="Configure equivalências próprias para xícara, colher, pacote, caixa ou medidas personalizadas."
        action={<Button variant="secondary" onClick={() => navigate('/insumos')}>Voltar</Button>}
      />

      <div className="split-stack">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            const quantidadeOrigem = parsePtNumber(form.quantidadeOrigem);
            const quantidadeDestino = parsePtNumber(form.quantidadeDestino);
            if (quantidadeOrigem <= 0 || quantidadeDestino <= 0) {
              setError('As quantidades da conversão precisam ser maiores que zero.');
              return;
            }

            addOrUpdateConversao(insumo.id, {
              id: form.id ?? gerarId('conv'),
              unidadeOrigem: form.unidadeOrigem,
              quantidadeOrigem,
              unidadeDestino: form.unidadeDestino,
              quantidadeDestino,
              observacoes: form.observacoes.trim() || undefined,
              updatedAt: new Date().toISOString(),
            });

            setForm(emptyForm());
          }}
        >
          {error ? <Notice tone="danger">{error}</Notice> : null}

          <div className="two-col">
            <TextField
              label="Quantidade de origem"
              inputMode="decimal"
              value={form.quantidadeOrigem}
              onChange={(e) => setForm((prev) => ({ ...prev, quantidadeOrigem: e.target.value }))}
            />
            <SelectField
              label="Unidade de origem"
              value={form.unidadeOrigem}
              onChange={(e) => setForm((prev) => ({ ...prev, unidadeOrigem: e.target.value as RecipeUnit }))}
            >
              {['xicara', 'meia_xicara', 'terco_xicara', 'quarto_xicara', 'colher_sopa', 'colher_cha', 'unidade', 'duzia', 'g', 'kg', 'ml', 'litro', 'pacote', 'caixa', 'porcao_personalizada'].map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="two-col">
            <TextField
              label="Quantidade de destino"
              inputMode="decimal"
              value={form.quantidadeDestino}
              onChange={(e) => setForm((prev) => ({ ...prev, quantidadeDestino: e.target.value }))}
            />
            <SelectField
              label="Unidade de destino"
              value={form.unidadeDestino}
              onChange={(e) => setForm((prev) => ({ ...prev, unidadeDestino: e.target.value as ConversaoInsumo['unidadeDestino'] }))}
            >
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="unidade">unidade</option>
            </SelectField>
          </div>

          <TextAreaField
            label="Observações"
            value={form.observacoes}
            onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
            rows={3}
            placeholder="Ex.: xícara cheia nivelada"
          />

          <div className="button-row">
            <Button type="submit">{form.id ? 'Atualizar conversão' : 'Salvar conversão'}</Button>
            <Button variant="ghost" onClick={() => setForm(emptyForm())}>
              Limpar
            </Button>
          </div>
        </form>

        <Card className="panel panel-soft">
          <SectionTitle title="Conversões cadastradas" subtitle="Clique para editar ou excluir." />
          {insumo.conversoes.length ? (
            <div className="list">
              {insumo.conversoes.map((conversao) => (
                <div key={conversao.id} className="list-row list-row--static">
                  <div>
                    <strong>
                      {formatItem(conversao.quantidadeOrigem, conversao.unidadeOrigem)} = {formatItem(conversao.quantidadeDestino, conversao.unidadeDestino)}
                    </strong>
                    {conversao.observacoes ? <span>{conversao.observacoes}</span> : null}
                  </div>
                  <div className="list-row__side">
                    <Button variant="secondary" onClick={() => onEdit(conversao)}>
                      <Icon name="pencil" className="icon" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm('Excluir esta conversão?')) {
                          deleteConversao(insumo.id, conversao.id);
                        }
                      }}
                    >
                      <Icon name="trash" className="icon" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma conversão"
              description="Adicione equivalências como 1 xícara = 200 g ou 1 dúzia = 12 unidades."
            />
          )}
        </Card>
      </div>
    </Card>
  );
}

function formatItem(quantity: number, unit: string) {
  return `${quantity} ${unitLabel(unit)}`;
}
