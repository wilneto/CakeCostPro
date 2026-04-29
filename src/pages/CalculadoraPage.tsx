import { useMemo, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { calcularCustoTotalReceita, calcularPrecoVendaPorMargem, calcularPrecoVendaPorMarkup, calcularCustoPorFatia } from '@/utils/calculations';
import { formatBRL, parsePtNumber } from '@/utils/units';
import { Button, Card, Notice, SectionTitle, SelectField, TextField } from '@/components/ui';

export function CalculadoraPage({ navigate }: { navigate: (path: string) => void }) {
  const { receitas, insumos, configuracoes } = useAppData();
  const [mode, setMode] = useState<'receita' | 'manual'>('receita');
  const [receitaId, setReceitaId] = useState(receitas[0]?.id ?? '');
  const [custoManual, setCustoManual] = useState('');
  const [fatiasManual, setFatiasManual] = useState('10');
  const [margem, setMargem] = useState(String(configuracoes.percentualMargemPadrao));
  const [markup, setMarkup] = useState(String(configuracoes.percentualMargemPadrao));
  const [taxaExtra, setTaxaExtra] = useState(String(configuracoes.taxaExtraOpcional));

  const resultado = useMemo(() => {
    const custo = mode === 'receita' && receitaId ? receitas.find((item) => item.id === receitaId) : null;
    const custoTotal = custo ? calcularCustoTotalReceita(custo, insumos, configuracoes).custoTotal : parsePtNumber(custoManual);
    const fatias = custo ? custo.quantidadeFatias : parsePtNumber(fatiasManual);
    const margemNum = parsePtNumber(margem);
    const markupNum = parsePtNumber(markup);
    const taxaExtraNum = parsePtNumber(taxaExtra);

    return {
      custoTotal,
      fatias,
      custoPorFatia: calcularCustoPorFatia(custoTotal, fatias),
      precoMargem: calcularPrecoVendaPorMargem(custoTotal, margemNum, taxaExtraNum, configuracoes.arredondamentoComercial),
      precoMarkup: calcularPrecoVendaPorMarkup(custoTotal, markupNum, taxaExtraNum, configuracoes.arredondamentoComercial),
      custoBase: custo,
    };
  }, [configuracoes.arredondamentoComercial, custoManual, fatiasManual, insumos, margem, markup, mode, receitaId, receitas, taxaExtra]);

  return (
    <Card>
      <SectionTitle
        title="Calculadora de preço"
        subtitle="Compare margem sobre venda e markup sobre custo com o custo total da receita ou um valor manual."
      />

      <div className="toggle-row">
        <button className={`toggle ${mode === 'receita' ? 'is-active' : ''}`} type="button" onClick={() => setMode('receita')}>
          Usar receita
        </button>
        <button className={`toggle ${mode === 'manual' ? 'is-active' : ''}`} type="button" onClick={() => setMode('manual')}>
          Manual
        </button>
      </div>

      <div className="form-grid">
        {mode === 'receita' ? (
          <SelectField label="Receita" value={receitaId} onChange={(e) => setReceitaId(e.target.value)}>
            <option value="">Selecione</option>
            {receitas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </SelectField>
        ) : (
          <TextField label="Custo total manual" inputMode="decimal" value={custoManual} onChange={(e) => setCustoManual(e.target.value)} />
        )}

        <TextField label="Margem desejada (%)" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} />
        <TextField label="Markup (%)" inputMode="decimal" value={markup} onChange={(e) => setMarkup(e.target.value)} />
        <TextField label="Taxa extra opcional (%)" inputMode="decimal" value={taxaExtra} onChange={(e) => setTaxaExtra(e.target.value)} />

        {mode === 'manual' ? <TextField label="Quantidade de fatias" inputMode="decimal" value={fatiasManual} onChange={(e) => setFatiasManual(e.target.value)} /> : null}
      </div>

      {!receitas.length && mode === 'receita' ? <Notice tone="warning">Nenhuma receita cadastrada. Use o modo manual ou crie uma receita primeiro.</Notice> : null}

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
          <span>Preço por margem</span>
          <strong>{formatBRL(resultado.precoMargem)}</strong>
        </div>
        <div className="mini-metric">
          <span>Preço por markup</span>
          <strong>{formatBRL(resultado.precoMarkup)}</strong>
        </div>
      </div>

      <Card className="panel panel-soft">
        <SectionTitle title="Entendendo a diferença" />
        <p className="copy-block">
          Margem sobre venda calcula o preço com base no que sobra depois de descontar o lucro desejado. Markup sobre
          custo soma um percentual fixo em cima do custo.
        </p>
        <p className="copy-block">
          Exemplo: custo de R$ 30,00 com margem de 40% resulta em R$ 50,00. O mesmo custo com markup de 40% resulta
          em R$ 42,00.
        </p>
      </Card>

      <div className="button-row">
        <Button onClick={() => navigate('/receitas/novo')}>Nova receita</Button>
      </div>
    </Card>
  );
}
