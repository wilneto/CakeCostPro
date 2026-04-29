import { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Button, Card, SectionTitle, SelectField, TextField } from '@/components/ui';
import { parsePtNumber } from '@/utils/units';

export function ConfiguracoesPage({ navigate }: { navigate: (path: string) => void }) {
  const { configuracoes, updateConfiguracoes } = useAppData();
  const [form, setForm] = useState({
    valorHoraMaoDeObra: String(configuracoes.valorHoraMaoDeObra),
    custoGásPorHora: String(configuracoes.custoGásPorHora),
    custoEnergiaPorHora: String(configuracoes.custoEnergiaPorHora),
    percentualPerdas: String(configuracoes.percentualPerdas),
    percentualMargemPadrao: String(configuracoes.percentualMargemPadrao),
    percentualMarkupPadrao: String(configuracoes.percentualMarkupPadrao ?? configuracoes.percentualMargemPadrao),
    custoPadraoEmbalagem: String(configuracoes.custoPadraoEmbalagem),
    taxaExtraOpcional: String(configuracoes.taxaExtraOpcional),
    arredondamentoComercial: String(configuracoes.arredondamentoComercial),
    modoPrecoPadrao: configuracoes.modoPrecoPadrao,
  });

  return (
    <Card>
      <SectionTitle
        title="Configurações"
        subtitle="Ajuste custos indiretos, margem padrão, arredondamento e o modo de precificação principal."
        action={<Button variant="secondary" onClick={() => navigate('/backup')}>Backup</Button>}
      />

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          updateConfiguracoes({
            valorHoraMaoDeObra: parsePtNumber(form.valorHoraMaoDeObra),
            custoGásPorHora: parsePtNumber(form.custoGásPorHora),
            custoEnergiaPorHora: parsePtNumber(form.custoEnergiaPorHora),
            percentualPerdas: parsePtNumber(form.percentualPerdas),
            percentualMargemPadrao: parsePtNumber(form.percentualMargemPadrao),
            percentualMarkupPadrao: parsePtNumber(form.percentualMarkupPadrao),
            custoPadraoEmbalagem: parsePtNumber(form.custoPadraoEmbalagem),
            taxaExtraOpcional: parsePtNumber(form.taxaExtraOpcional),
            arredondamentoComercial: parsePtNumber(form.arredondamentoComercial),
            modoPrecoPadrao: form.modoPrecoPadrao,
          });
          navigate('/inicio');
        }}
      >
        <div className="two-col">
          <TextField label="Valor hora da mão de obra" inputMode="decimal" value={form.valorHoraMaoDeObra} onChange={(e) => setForm((prev) => ({ ...prev, valorHoraMaoDeObra: e.target.value }))} />
          <TextField label="Gás por hora" inputMode="decimal" value={form.custoGásPorHora} onChange={(e) => setForm((prev) => ({ ...prev, custoGásPorHora: e.target.value }))} />
        </div>

        <div className="two-col">
          <TextField label="Energia por hora" inputMode="decimal" value={form.custoEnergiaPorHora} onChange={(e) => setForm((prev) => ({ ...prev, custoEnergiaPorHora: e.target.value }))} />
          <TextField label="Percentual de perdas" inputMode="decimal" value={form.percentualPerdas} onChange={(e) => setForm((prev) => ({ ...prev, percentualPerdas: e.target.value }))} />
        </div>

        <div className="two-col">
          <TextField label="Margem padrão" inputMode="decimal" value={form.percentualMargemPadrao} onChange={(e) => setForm((prev) => ({ ...prev, percentualMargemPadrao: e.target.value }))} />
          <TextField
            label="Markup padrão"
            inputMode="decimal"
            value={form.percentualMarkupPadrao}
            onChange={(e) => setForm((prev) => ({ ...prev, percentualMarkupPadrao: e.target.value }))}
            hint="Usado quando o modo padrão de preço for markup."
          />
        </div>

        <TextField label="Embalagem padrão" inputMode="decimal" value={form.custoPadraoEmbalagem} onChange={(e) => setForm((prev) => ({ ...prev, custoPadraoEmbalagem: e.target.value }))} />

        <div className="two-col">
          <TextField label="Taxa extra opcional" inputMode="decimal" value={form.taxaExtraOpcional} onChange={(e) => setForm((prev) => ({ ...prev, taxaExtraOpcional: e.target.value }))} />
          <TextField label="Arredondamento comercial" inputMode="decimal" value={form.arredondamentoComercial} onChange={(e) => setForm((prev) => ({ ...prev, arredondamentoComercial: e.target.value }))} />
        </div>

        <SelectField label="Modo padrão de preço" value={form.modoPrecoPadrao} onChange={(e) => setForm((prev) => ({ ...prev, modoPrecoPadrao: e.target.value as 'margem' | 'markup' }))}>
          <option value="margem">margem sobre venda</option>
          <option value="markup">markup sobre custo</option>
        </SelectField>

        <div className="button-row">
          <Button type="submit">Salvar configurações</Button>
          <Button variant="secondary" onClick={() => navigate('/backup')}>Exportar / importar</Button>
        </div>
      </form>
    </Card>
  );
}
