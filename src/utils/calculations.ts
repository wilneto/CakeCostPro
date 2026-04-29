import type {
  BaseUnit,
  Configuracoes,
  ConversaoInsumo,
  IngredienteReceita,
  Insumo,
  Receita,
  ResultadoCusto,
  ResultadoItemIngrediente,
} from '@/types';
import {
  directBaseFromPurchaseUnit,
  normalizeRecipeUnit,
  parsePtNumber,
  purchaseUnitToBaseFactor,
  roundToStep,
} from '@/utils/units';

function findConversion(
  conversoes: ConversaoInsumo[],
  unidadeOrigem: string,
  baseUnit: BaseUnit
): ConversaoInsumo | undefined {
  return conversoes.find((conversao) => conversao.unidadeOrigem === unidadeOrigem && conversao.unidadeDestino === baseUnit);
}

function getPurchaseBaseInfo(insumo: Insumo): { quantidadeBase: number; unidadeBase: BaseUnit } {
  const directUnit = directBaseFromPurchaseUnit(insumo.unidadeCompra);
  const directFactor = purchaseUnitToBaseFactor(insumo.unidadeCompra);

  if (directUnit && directFactor) {
    return {
      quantidadeBase: insumo.quantidadeComprada * directFactor,
      unidadeBase: directUnit,
    };
  }

  const explicitConversion = insumo.conversoes.find(
    (conversao) => conversao.unidadeOrigem === insumo.unidadeCompra && conversao.quantidadeOrigem > 0
  );

  if (explicitConversion) {
    return {
      quantidadeBase:
        (insumo.quantidadeComprada / explicitConversion.quantidadeOrigem) * explicitConversion.quantidadeDestino,
      unidadeBase: explicitConversion.unidadeDestino,
    };
  }

  if (insumo.rendimentoBase && insumo.unidadeBaseCalculada) {
    return {
      quantidadeBase: insumo.rendimentoBase,
      unidadeBase: insumo.unidadeBaseCalculada,
    };
  }

  throw new Error(
    `Não foi possível calcular a base do insumo "${insumo.nome}". Configure rendimento base ou uma conversão de compra.`
  );
}

export function calcularPrecoUnitarioInsumo(insumo: Insumo): number {
  const baseInfo = getPurchaseBaseInfo(insumo);
  if (!baseInfo.quantidadeBase || baseInfo.quantidadeBase <= 0) {
    throw new Error(`Insumo "${insumo.nome}" sem rendimento válido.`);
  }

  return insumo.precoPago / baseInfo.quantidadeBase;
}

export function converterMedidaParaBase(quantidade: number, unidade: string, insumo: Insumo): number {
  const baseInfo = getPurchaseBaseInfo(insumo);
  const normalized = normalizeRecipeUnit(unidade as never);
  const directFactor = normalized.factor;

  if (normalized.base === baseInfo.unidadeBase) {
    return quantidade * directFactor;
  }

  const directByPurchase =
    findConversion(insumo.conversoes, normalized.base, baseInfo.unidadeBase) ||
    findConversion(insumo.conversoes, unidade, baseInfo.unidadeBase);

  if (directByPurchase) {
    const factor = directByPurchase.quantidadeDestino / directByPurchase.quantidadeOrigem;
    return quantidade * directFactor * factor;
  }

  const exactCustom = findConversion(insumo.conversoes, unidade, baseInfo.unidadeBase);
  if (exactCustom) {
    const factor = exactCustom.quantidadeDestino / exactCustom.quantidadeOrigem;
    return quantidade * factor;
  }

  if (
    (normalized.base === 'xicara' || normalized.base === 'colher_sopa' || normalized.base === 'colher_cha') &&
    baseInfo.unidadeBase === 'g'
  ) {
    const cupConversion = findConversion(insumo.conversoes, 'xicara', 'g');
    const spoonConversion = findConversion(insumo.conversoes, normalized.base, 'g');
    const source = cupConversion || spoonConversion;
    if (source) {
      const factor = source.quantidadeDestino / source.quantidadeOrigem;
      return quantidade * directFactor * factor;
    }
  }

  throw new Error(
    `Sem conversão compatível para "${unidade}" em "${insumo.nome}". Cadastre uma conversão personalizada.`
  );
}

export function calcularCustoIngrediente(ingrediente: IngredienteReceita, insumo: Insumo): number {
  const custoUnitario = calcularPrecoUnitarioInsumo(insumo);
  const quantidadeBase = converterMedidaParaBase(ingrediente.quantidade, ingrediente.unidade, insumo);
  return quantidadeBase * custoUnitario;
}

export function calcularCustoIngredientesReceita(
  receita: Receita,
  insumos: Insumo[]
): {
  itens: ResultadoItemIngrediente[];
  custoIngredientes: number;
  avisos: string[];
} {
  const itens: ResultadoItemIngrediente[] = [];
  const avisos: string[] = [];

  for (const ingrediente of receita.ingredientes) {
    const insumo = insumos.find((item) => item.id === ingrediente.insumoId);
    let baseUnit: BaseUnit = 'g';
    if (insumo) {
      try {
        baseUnit = getPurchaseBaseInfo(insumo).unidadeBase;
      } catch {
        baseUnit = insumo.unidadeBaseCalculada ?? 'g';
      }
    }
    if (!insumo) {
      avisos.push(`Insumo não encontrado para um ingrediente da receita "${receita.nome}".`);
      itens.push({
        ingredienteId: ingrediente.id,
        insumoId: ingrediente.insumoId,
        nomeInsumo: 'Insumo ausente',
        quantidade: ingrediente.quantidade,
        unidade: ingrediente.unidade,
        quantidadeBase: 0,
        unidadeBase: baseUnit,
        custoUnitarioBase: 0,
        custo: 0,
        observacao: ingrediente.observacoes,
        aviso: 'Insumo removido ou não encontrado.',
      });
      continue;
    }

    try {
      const custoUnitario = calcularPrecoUnitarioInsumo(insumo);
      const quantidadeBase = converterMedidaParaBase(ingrediente.quantidade, ingrediente.unidade, insumo);
      const custo = quantidadeBase * custoUnitario;
      itens.push({
        ingredienteId: ingrediente.id,
        insumoId: insumo.id,
        nomeInsumo: insumo.nome,
        quantidade: ingrediente.quantidade,
        unidade: ingrediente.unidade,
        quantidadeBase,
        unidadeBase: baseUnit,
        custoUnitarioBase: custoUnitario,
        custo,
        observacao: ingrediente.observacoes,
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao calcular ingrediente.';
      avisos.push(mensagem);
      itens.push({
        ingredienteId: ingrediente.id,
        insumoId: insumo.id,
        nomeInsumo: insumo.nome,
        quantidade: ingrediente.quantidade,
        unidade: ingrediente.unidade,
        quantidadeBase: 0,
        unidadeBase: baseUnit,
        custoUnitarioBase: 0,
        custo: 0,
        observacao: ingrediente.observacoes,
        aviso: mensagem,
      });
    }
  }

  return {
    itens,
    custoIngredientes: itens.reduce((acc, item) => acc + item.custo, 0),
    avisos,
  };
}

export function calcularCustoMaoDeObra(minutos: number, valorHora: number): number {
  if (minutos <= 0 || valorHora <= 0) {
    return 0;
  }

  return (valorHora / 60) * minutos;
}

export function calcularCustoForno(
  minutos: number,
  custoGasPorHora: number,
  custoEnergiaPorHora: number,
  tipoForno: Receita['tipoForno']
): number {
  if (minutos <= 0) {
    return 0;
  }

  const custoBase =
    tipoForno === 'gas'
      ? custoGasPorHora
      : tipoForno === 'eletrico' || tipoForno === 'industrial'
        ? custoEnergiaPorHora
        : custoGasPorHora || custoEnergiaPorHora;

  if (custoBase <= 0) {
    return 0;
  }

  return (custoBase / 60) * minutos;
}

export function calcularCustoPerdas(custoBase: number, percentualPerdas: number): number {
  if (custoBase <= 0 || percentualPerdas <= 0) {
    return 0;
  }

  return (custoBase * percentualPerdas) / 100;
}

export function calcularPrecoVendaPorMargem(
  custoTotal: number,
  margemPercentual: number,
  taxaExtraOpcional = 0,
  arredondamentoComercial = 0
): number {
  const margem = Math.max(0, margemPercentual);
  const custoBase = custoTotal * (1 + Math.max(0, taxaExtraOpcional) / 100);
  const preco = custoBase * (1 + margem / 100);
  return roundToStep(preco, arredondamentoComercial);
}

export function calcularPrecoVendaPorMarkup(
  custoTotal: number,
  markupPercentual: number,
  taxaExtraOpcional = 0,
  arredondamentoComercial = 0
): number {
  const markup = Math.max(0, markupPercentual);
  const custoBase = custoTotal * (1 + Math.max(0, taxaExtraOpcional) / 100);
  const preco = custoBase * (1 + markup / 100);
  return roundToStep(preco, arredondamentoComercial);
}

export function calcularCustoPorFatia(custoTotal: number, quantidadeFatias: number): number {
  if (quantidadeFatias <= 0) {
    return 0;
  }

  return custoTotal / quantidadeFatias;
}

export function calcularCustoTotalReceita(
  receita: Receita,
  insumos: Insumo[],
  configuracoes: Configuracoes
): ResultadoCusto {
  const ingredientes = calcularCustoIngredientesReceita(receita, insumos);
  const custoEmbalagem = receita.custoEmbalagem ?? configuracoes.custoPadraoEmbalagem;
  const custoMaoDeObra = calcularCustoMaoDeObra(receita.tempoPreparoMin, configuracoes.valorHoraMaoDeObra);
  const custoForno = calcularCustoForno(
    receita.tempoFornoMin,
    configuracoes.custoGásPorHora,
    configuracoes.custoEnergiaPorHora,
    receita.tipoForno
  );
  const custoPerdas = calcularCustoPerdas(ingredientes.custoIngredientes, configuracoes.percentualPerdas);
  const custoExtras = parsePtNumber(receita.custosExtras);
  const custoTotal =
    ingredientes.custoIngredientes +
    custoEmbalagem +
    custoMaoDeObra +
    custoForno +
    custoPerdas +
    custoExtras;
  const custoPorFatia = calcularCustoPorFatia(custoTotal, receita.quantidadeFatias);
  const margem = receita.margemDesejada ?? configuracoes.percentualMargemPadrao;
  const markup = configuracoes.percentualMarkupPadrao ?? margem;
  const taxaExtra = receita.taxaExtraOpcional ?? configuracoes.taxaExtraOpcional;
  const arredondamento = receita.arredondamentoComercial ?? configuracoes.arredondamentoComercial;
  const precoVendaPorMargem = calcularPrecoVendaPorMargem(custoTotal, margem, taxaExtra, arredondamento);
  const precoVendaPorMarkup = calcularPrecoVendaPorMarkup(
    custoTotal,
    markup,
    taxaExtra,
    arredondamento
  );
  const precoSugerido = configuracoes.modoPrecoPadrao === 'markup' ? precoVendaPorMarkup : precoVendaPorMargem;
  const precoPorFatia = calcularCustoPorFatia(precoSugerido, receita.quantidadeFatias);
  const lucroEstimado = precoSugerido - custoTotal;
  const margemAplicada = precoSugerido > 0 ? (lucroEstimado / precoSugerido) * 100 : 0;

  const avisos = [...ingredientes.avisos];
  if (!configuracoes.valorHoraMaoDeObra && receita.tempoPreparoMin > 0) {
    avisos.push('Configure o valor da mão de obra para obter um custo completo.');
  }
  if (!configuracoes.custoGásPorHora && receita.tempoFornoMin > 0 && receita.tipoForno === 'gas') {
    avisos.push('Configure o custo do gás por hora para calcular o forno.');
  }
  if (!configuracoes.custoEnergiaPorHora && receita.tempoFornoMin > 0 && receita.tipoForno !== 'gas') {
    avisos.push('Configure o custo de energia por hora para calcular o forno.');
  }
  if (!receita.quantidadeFatias) {
    avisos.push('Informe a quantidade de fatias para calcular custo por porção.');
  }

  return {
    itens: ingredientes.itens,
    avisos,
    custoIngredientes: ingredientes.custoIngredientes,
    custoEmbalagem,
    custoMaoDeObra,
    custoForno,
    custoPerdas,
    custoExtras,
    custoTotal,
    custoPorFatia,
    precoVendaPorMargem,
    precoVendaPorMarkup,
    precoSugerido,
    precoPorFatia,
    lucroEstimado,
    margemAplicada,
  };
}
