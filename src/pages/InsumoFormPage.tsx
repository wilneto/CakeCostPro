import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import type { BaseUnit, Insumo } from '@/types';
import { gerarId } from '@/utils/ids';
import { formatDecimalBR, parsePtNumber } from '@/utils/units';
import { Button, Card, Notice, SectionTitle, SelectField, TextAreaField, TextField } from '@/components/ui';

const baseUnitOptions: BaseUnit[] = ['g', 'ml', 'unidade'];

interface FormState {
  nome: string;
  categoria: string;
  quantidadeComprada: string;
  unidadeCompra: Insumo['unidadeCompra'];
  precoPago: string;
  rendimentoBase: string;
  unidadeBaseCalculada: BaseUnit;
  observacoes: string;
}

function emptyState(): FormState {
  return {
    nome: '',
    categoria: 'outros',
    quantidadeComprada: '1',
    unidadeCompra: 'kg',
    precoPago: '',
    rendimentoBase: '',
    unidadeBaseCalculada: 'g',
    observacoes: '',
  };
}

function formatEditableNumber(value?: number, maximumFractionDigits = 2, minimumFractionDigits = 0): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '';
  }

  return formatDecimalBR(value, maximumFractionDigits, minimumFractionDigits);
}

function normalizeEditableNumber(value: string, maximumFractionDigits = 2, minimumFractionDigits = 0): string {
  if (!value.trim()) {
    return '';
  }

  return formatDecimalBR(parsePtNumber(value), maximumFractionDigits, minimumFractionDigits);
}

function toInsumo(form: FormState, current?: Insumo): Insumo {
  const now = new Date().toISOString();
  return {
    id: current?.id ?? gerarId('insumo'),
    nome: form.nome.trim(),
    categoria: form.categoria.trim(),
    quantidadeComprada: parsePtNumber(form.quantidadeComprada),
    unidadeCompra: form.unidadeCompra,
    precoPago: parsePtNumber(form.precoPago),
    rendimentoBase: form.rendimentoBase ? parsePtNumber(form.rendimentoBase) : undefined,
    unidadeBaseCalculada: form.rendimentoBase ? form.unidadeBaseCalculada : undefined,
    observacoes: form.observacoes.trim() || undefined,
    conversoes: current?.conversoes ?? [],
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
}

export function InsumoFormPage({
  navigate,
  insumoId,
}: {
  navigate: (path: string) => void;
  insumoId?: string;
}) {
  const { insumos, addOrUpdateInsumo } = useAppData();
  const current = useMemo(() => insumos.find((item) => item.id === insumoId), [insumoId, insumos]);
  const [form, setForm] = useState<FormState>(emptyState());
  const [error, setError] = useState('');

  useEffect(() => {
    if (current) {
      setForm({
        nome: current.nome,
        categoria: current.categoria,
        quantidadeComprada: formatEditableNumber(current.quantidadeComprada, 2, 0),
        unidadeCompra: current.unidadeCompra,
        precoPago: formatEditableNumber(current.precoPago, 2, 2),
        rendimentoBase: formatEditableNumber(current.rendimentoBase, 2, 0),
        unidadeBaseCalculada: current.unidadeBaseCalculada ?? 'g',
        observacoes: current.observacoes ?? '',
      });
    }
  }, [current]);

  const isEdit = Boolean(current);

  return (
    <Card>
      <SectionTitle
        title={isEdit ? 'Editar insumo' : 'Novo insumo'}
        subtitle="Preencha os dados de compra e, se necessário, informe o rendimento base do pacote ou caixa."
        action={<Button variant="secondary" onClick={() => navigate('/insumos')}>Cancelar</Button>}
      />

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (!form.nome.trim()) {
            setError('Informe o nome do insumo.');
            return;
          }
          if (parsePtNumber(form.quantidadeComprada) <= 0) {
            setError('A quantidade comprada deve ser maior que zero.');
            return;
          }
          if (parsePtNumber(form.precoPago) < 0) {
            setError('O preço não pode ser negativo.');
            return;
          }
          const next = toInsumo(form, current);
          addOrUpdateInsumo(next);
          navigate('/insumos');
        }}
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <TextField label="Nome" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Açúcar refinado" />
        <TextField label="Categoria" value={form.categoria} onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))} placeholder="ingrediente" />

        <div className="two-col">
          <TextField
            label="Quantidade comprada"
            inputMode="decimal"
            value={form.quantidadeComprada}
            onChange={(e) => setForm((prev) => ({ ...prev, quantidadeComprada: e.target.value }))}
            onBlur={(e) =>
              setForm((prev) => ({ ...prev, quantidadeComprada: normalizeEditableNumber(e.target.value, 2, 0) }))
            }
            placeholder="1"
          />
          <SelectField
            label="Unidade de compra"
            value={form.unidadeCompra}
            onChange={(e) => setForm((prev) => ({ ...prev, unidadeCompra: e.target.value as Insumo['unidadeCompra'] }))}
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="litro">litro</option>
            <option value="ml">ml</option>
            <option value="unidade">unidade</option>
            <option value="duzia">dúzia</option>
            <option value="pacote">pacote</option>
            <option value="caixa">caixa</option>
          </SelectField>
        </div>

        <div className="two-col">
          <TextField
            label="Preço pago"
            inputMode="decimal"
            value={form.precoPago}
            onChange={(e) => setForm((prev) => ({ ...prev, precoPago: e.target.value }))}
            onBlur={(e) =>
              setForm((prev) => ({ ...prev, precoPago: normalizeEditableNumber(e.target.value, 2, 2) }))
            }
            placeholder="5,00"
            hint="Aceita vírgula decimal, como 12,50."
          />
          <TextField
            label="Rendimento base"
            inputMode="decimal"
            value={form.rendimentoBase}
            onChange={(e) => setForm((prev) => ({ ...prev, rendimentoBase: e.target.value }))}
            onBlur={(e) =>
              setForm((prev) => ({ ...prev, rendimentoBase: normalizeEditableNumber(e.target.value, 2, 0) }))
            }
            placeholder="Ex.: 500"
          />
        </div>

        <SelectField
          label="Unidade base calculada"
          value={form.unidadeBaseCalculada}
          onChange={(e) => setForm((prev) => ({ ...prev, unidadeBaseCalculada: e.target.value as BaseUnit }))}
          hint="Use esta base quando o item for comprado em pacote, caixa ou outra apresentação com rendimento conhecido."
        >
          {baseUnitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </SelectField>

        <TextAreaField
          label="Observações"
          value={form.observacoes}
          onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
          rows={4}
          placeholder="Ex.: pacote rende 10 porções"
        />

        <div className="button-row">
          <Button type="submit">{isEdit ? 'Salvar alterações' : 'Criar insumo'}</Button>
          <Button variant="ghost" onClick={() => navigate('/insumos')}>
            Voltar
          </Button>
        </div>
      </form>
    </Card>
  );
}
