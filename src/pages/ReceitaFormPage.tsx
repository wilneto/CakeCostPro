import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import type { IngredienteReceita, Receita, RecipeUnit, FornoTipo } from '@/types';
import { gerarId } from '@/utils/ids';
import { calcularCustoIngredientesReceita } from '@/utils/calculations';
import { parsePtNumber, unitLabel } from '@/utils/units';
import { Button, Card, EmptyState, Icon, Notice, SectionTitle, SelectField, TextAreaField, TextField } from '@/components/ui';

interface IngredientFormState {
  id: string;
  insumoId: string;
  quantidade: string;
  unidade: RecipeUnit;
  observacoes: string;
}

interface RecipeFormState {
  nome: string;
  descricao: string;
  tamanhoOuRendimento: string;
  quantidadeFatias: string;
  pesoAproximadoFinal: string;
  custosExtras: string;
  custoEmbalagem: string;
  tempoPreparoMin: string;
  tempoFornoMin: string;
  tempoDescansoMin: string;
  temperaturaForno: string;
  tipoForno: FornoTipo;
  margemDesejada: string;
  taxaExtraOpcional: string;
  arredondamentoComercial: string;
  observacoes: string;
}

function emptyRecipeForm(): RecipeFormState {
  return {
    nome: '',
    descricao: '',
    tamanhoOuRendimento: '',
    quantidadeFatias: '10',
    pesoAproximadoFinal: '',
    custosExtras: '0',
    custoEmbalagem: '',
    tempoPreparoMin: '0',
    tempoFornoMin: '0',
    tempoDescansoMin: '0',
    temperaturaForno: '',
    tipoForno: 'gas',
    margemDesejada: '',
    taxaExtraOpcional: '',
    arredondamentoComercial: '',
    observacoes: '',
  };
}

function emptyIngredient(insumoId = ''): IngredientFormState {
  return {
    id: gerarId('ing'),
    insumoId,
    quantidade: '1',
    unidade: 'g',
    observacoes: '',
  };
}

function buildReceita(form: RecipeFormState, ingredients: IngredientFormState[], current?: Receita): Receita {
  const now = new Date().toISOString();
  return {
    id: current?.id ?? gerarId('receita'),
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || undefined,
    tamanhoOuRendimento: form.tamanhoOuRendimento.trim() || undefined,
    quantidadeFatias: parsePtNumber(form.quantidadeFatias),
    pesoAproximadoFinal: form.pesoAproximadoFinal ? parsePtNumber(form.pesoAproximadoFinal) : undefined,
    ingredientes: ingredients
      .filter((item) => item.insumoId)
      .map((item) => ({
        id: item.id,
        insumoId: item.insumoId,
        quantidade: parsePtNumber(item.quantidade),
        unidade: item.unidade,
        observacoes: item.observacoes.trim() || undefined,
      })),
    custosExtras: parsePtNumber(form.custosExtras),
    custoEmbalagem: form.custoEmbalagem ? parsePtNumber(form.custoEmbalagem) : undefined,
    tempoPreparoMin: parsePtNumber(form.tempoPreparoMin),
    tempoFornoMin: parsePtNumber(form.tempoFornoMin),
    tempoDescansoMin: parsePtNumber(form.tempoDescansoMin),
    temperaturaForno: form.temperaturaForno ? parsePtNumber(form.temperaturaForno) : undefined,
    tipoForno: form.tipoForno,
    observacoes: form.observacoes.trim() || undefined,
    margemDesejada: form.margemDesejada ? parsePtNumber(form.margemDesejada) : undefined,
    taxaExtraOpcional: form.taxaExtraOpcional ? parsePtNumber(form.taxaExtraOpcional) : undefined,
    arredondamentoComercial: form.arredondamentoComercial ? parsePtNumber(form.arredondamentoComercial) : undefined,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
}

export function ReceitaFormPage({
  navigate,
  receitaId,
}: {
  navigate: (path: string) => void;
  receitaId?: string;
}) {
  const { receitas, insumos, configuracoes, addOrUpdateReceita } = useAppData();
  const current = useMemo(() => receitas.find((item) => item.id === receitaId), [receitaId, receitas]);
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm());
  const [ingredients, setIngredients] = useState<IngredientFormState[]>([emptyIngredient(insumos[0]?.id)]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (current) {
      setForm({
        nome: current.nome,
        descricao: current.descricao ?? '',
        tamanhoOuRendimento: current.tamanhoOuRendimento ?? '',
        quantidadeFatias: String(current.quantidadeFatias ?? ''),
        pesoAproximadoFinal: current.pesoAproximadoFinal ? String(current.pesoAproximadoFinal) : '',
        custosExtras: String(current.custosExtras ?? 0),
        custoEmbalagem: current.custoEmbalagem ? String(current.custoEmbalagem) : '',
        tempoPreparoMin: String(current.tempoPreparoMin ?? 0),
        tempoFornoMin: String(current.tempoFornoMin ?? 0),
        tempoDescansoMin: String(current.tempoDescansoMin ?? 0),
        temperaturaForno: current.temperaturaForno ? String(current.temperaturaForno) : '',
        tipoForno: current.tipoForno,
        margemDesejada: current.margemDesejada ? String(current.margemDesejada) : '',
        taxaExtraOpcional: current.taxaExtraOpcional ? String(current.taxaExtraOpcional) : '',
        arredondamentoComercial: current.arredondamentoComercial ? String(current.arredondamentoComercial) : '',
        observacoes: current.observacoes ?? '',
      });
      setIngredients(
        current.ingredientes.length
          ? current.ingredientes.map((item) => ({
              id: item.id,
              insumoId: item.insumoId,
              quantidade: String(item.quantidade),
              unidade: item.unidade,
              observacoes: item.observacoes ?? '',
            }))
          : [emptyIngredient(insumos[0]?.id)]
      );
    }
  }, [current, insumos]);

  const preview = useMemo(() => {
    const receita = buildReceita(form, ingredients, current);
    try {
      return calcularCustoIngredientesReceita(receita, insumos);
    } catch (error) {
      return {
        custoIngredientes: 0,
        avisos: [error instanceof Error ? error.message : 'Erro no preview de custo.'],
        itens: [],
      };
    }
  }, [current, form, ingredients, insumos]);

  const isEdit = Boolean(current);

  return (
    <Card>
      <SectionTitle
        title={isEdit ? 'Editar receita' : 'Nova receita'}
        subtitle="Monte a lista de ingredientes, informe tempos e custos extras e veja o cálculo em tempo real."
        action={<Button variant="secondary" onClick={() => navigate('/receitas')}>Cancelar</Button>}
      />

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (!form.nome.trim()) {
            setError('Informe o nome da receita.');
            return;
          }
          if (parsePtNumber(form.quantidadeFatias) <= 0) {
            setError('A quantidade de fatias precisa ser maior que zero.');
            return;
          }
          if (!ingredients.some((item) => item.insumoId)) {
            setError('Adicione pelo menos um ingrediente.');
            return;
          }

          const next = buildReceita(form, ingredients, current);
          if (next.quantidadeFatias <= 0) {
            setError('A quantidade de fatias precisa ser maior que zero.');
            return;
          }
          addOrUpdateReceita(next);
          navigate(`/receitas/${next.id}`);
        }}
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <TextField label="Nome da receita" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Bolo de cenoura" />
        <TextAreaField label="Descrição" value={form.descricao} onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))} rows={3} />
        <TextField label="Tamanho ou rendimento" value={form.tamanhoOuRendimento} onChange={(e) => setForm((prev) => ({ ...prev, tamanhoOuRendimento: e.target.value }))} placeholder="Forma de 20 cm" />

        <div className="two-col">
          <TextField label="Quantidade de fatias" inputMode="decimal" value={form.quantidadeFatias} onChange={(e) => setForm((prev) => ({ ...prev, quantidadeFatias: e.target.value }))} />
          <TextField label="Peso final aproximado (g)" inputMode="decimal" value={form.pesoAproximadoFinal} onChange={(e) => setForm((prev) => ({ ...prev, pesoAproximadoFinal: e.target.value }))} />
        </div>

        <div className="two-col">
          <TextField label="Tempo de preparo (min)" inputMode="decimal" value={form.tempoPreparoMin} onChange={(e) => setForm((prev) => ({ ...prev, tempoPreparoMin: e.target.value }))} />
          <TextField label="Tempo de forno (min)" inputMode="decimal" value={form.tempoFornoMin} onChange={(e) => setForm((prev) => ({ ...prev, tempoFornoMin: e.target.value }))} />
        </div>

        <div className="two-col">
          <TextField label="Tempo de descanso (min)" inputMode="decimal" value={form.tempoDescansoMin} onChange={(e) => setForm((prev) => ({ ...prev, tempoDescansoMin: e.target.value }))} />
          <TextField label="Temperatura do forno (°C)" inputMode="decimal" value={form.temperaturaForno} onChange={(e) => setForm((prev) => ({ ...prev, temperaturaForno: e.target.value }))} />
        </div>

        <SelectField label="Tipo de forno" value={form.tipoForno} onChange={(e) => setForm((prev) => ({ ...prev, tipoForno: e.target.value as FornoTipo }))}>
          <option value="gas">gás</option>
          <option value="eletrico">elétrico</option>
          <option value="industrial">industrial</option>
          <option value="outro">outro</option>
        </SelectField>

        <div className="two-col">
          <TextField label="Custo extra da receita" inputMode="decimal" value={form.custosExtras} onChange={(e) => setForm((prev) => ({ ...prev, custosExtras: e.target.value }))} />
          <TextField label="Custo de embalagem" inputMode="decimal" value={form.custoEmbalagem} onChange={(e) => setForm((prev) => ({ ...prev, custoEmbalagem: e.target.value }))} />
        </div>

        <div className="two-col">
          <TextField label="Margem desejada (%)" inputMode="decimal" value={form.margemDesejada} onChange={(e) => setForm((prev) => ({ ...prev, margemDesejada: e.target.value }))} />
          <TextField label="Taxa extra opcional (%)" inputMode="decimal" value={form.taxaExtraOpcional} onChange={(e) => setForm((prev) => ({ ...prev, taxaExtraOpcional: e.target.value }))} />
        </div>

        <TextField label="Arredondamento comercial" inputMode="decimal" value={form.arredondamentoComercial} onChange={(e) => setForm((prev) => ({ ...prev, arredondamentoComercial: e.target.value }))} hint="Ex.: 0,50 arredonda para meio real acima." />
        <TextAreaField label="Observações" value={form.observacoes} onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} rows={4} />

        <Card className="panel panel-soft">
          <SectionTitle
            title="Ingredientes"
            subtitle="Cada item calcula o custo individual com base no insumo selecionado."
            action={
              <Button variant="secondary" onClick={() => setIngredients((prev) => [emptyIngredient(insumos[0]?.id), ...prev])}>
                Adicionar ingrediente
              </Button>
            }
          />

          <div className="stack">
            {ingredients.length ? (
              ingredients.map((ingredient, index) => {
                const insumo = insumos.find((item) => item.id === ingredient.insumoId);
                let aviso = '';
                let custoPrevisto = 0;
                if (insumo) {
                  try {
                    const receitaPreview = buildReceita(form, ingredients, current);
                    const item = calcularCustoIngredientesReceita(receitaPreview, insumos).itens.find((line) => line.ingredienteId === ingredient.id);
                    custoPrevisto = item?.custo ?? 0;
                    aviso = item?.aviso ?? '';
                  } catch (error) {
                    aviso = error instanceof Error ? error.message : 'Sem conversão compatível.';
                  }
                }

                return (
                  <div key={ingredient.id} className="ingredient-card">
                    <div className="ingredient-card__top">
                      <strong>Ingrediente {index + 1}</strong>
                      <Button
                        variant="ghost"
                        onClick={() => setIngredients((prev) => prev.filter((item) => item.id !== ingredient.id))}
                        disabled={ingredients.length === 1}
                      >
                        <Icon name="trash" className="icon" />
                      </Button>
                    </div>
                    <div className="two-col">
                      <SelectField
                        label="Insumo"
                        value={ingredient.insumoId}
                        onChange={(e) =>
                          setIngredients((prev) =>
                            prev.map((item) =>
                              item.id === ingredient.id ? { ...item, insumoId: e.target.value } : item
                            )
                          )
                        }
                      >
                        <option value="">Selecione</option>
                        {insumos.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        label="Unidade"
                        value={ingredient.unidade}
                        onChange={(e) =>
                          setIngredients((prev) =>
                            prev.map((item) =>
                              item.id === ingredient.id ? { ...item, unidade: e.target.value as RecipeUnit } : item
                            )
                          )
                        }
                      >
                        {['g', 'kg', 'ml', 'litro', 'unidade', 'duzia', 'xicara', 'meia_xicara', 'terco_xicara', 'quarto_xicara', 'colher_sopa', 'colher_cha', 'pacote', 'caixa', 'porcao_personalizada'].map((unit) => (
                          <option key={unit} value={unit}>
                            {unitLabel(unit)}
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    <div className="two-col">
                      <TextField
                        label="Quantidade"
                        inputMode="decimal"
                        value={ingredient.quantidade}
                        onChange={(e) =>
                          setIngredients((prev) =>
                            prev.map((item) =>
                              item.id === ingredient.id ? { ...item, quantidade: e.target.value } : item
                            )
                          )
                        }
                      />
                      <TextAreaField
                        label="Observação"
                        value={ingredient.observacoes}
                        onChange={(e) =>
                          setIngredients((prev) =>
                            prev.map((item) =>
                              item.id === ingredient.id ? { ...item, observacoes: e.target.value } : item
                            )
                          )
                        }
                        rows={3}
                      />
                    </div>

                    {ingredient.insumoId ? (
                      <div className="price-line">
                        <strong>{custoPrevisto ? `Custo estimado: ${custoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Custo pendente'}</strong>
                        {aviso ? <span>{aviso}</span> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState title="Adicione ingredientes" description="Escolha os insumos e suas medidas para começar a composição da receita." />
            )}
          </div>
        </Card>

        <Card className="panel panel-soft">
          <SectionTitle title="Prévia de custo" subtitle="Esta estimativa usa os insumos cadastrados e alerta quando alguma conversão está faltando." />
          <div className="stat-grid stat-grid--compact">
            <div className="mini-metric">
              <span>Custo dos ingredientes</span>
              <strong>{preview.custoIngredientes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>
            <div className="mini-metric">
              <span>Ingredientes resolvidos</span>
              <strong>{preview.itens.length}</strong>
            </div>
          </div>
          {preview.avisos.length ? <Notice tone="warning">{preview.avisos.join(' ')}</Notice> : null}
        </Card>

        <div className="button-row">
          <Button type="submit">{isEdit ? 'Salvar receita' : 'Criar receita'}</Button>
          <Button variant="ghost" onClick={() => navigate('/receitas')}>
            Voltar
          </Button>
        </div>
      </form>
    </Card>
  );
}
