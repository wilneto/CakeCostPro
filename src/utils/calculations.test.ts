import { describe, expect, it } from 'vitest';
import type { Insumo, Receita } from '@/types';
import {
  calcularCustoForno,
  calcularCustoIngredientesReceita,
  calcularCustoMaoDeObra,
  calcularCustoPerdas,
  calcularCustoTotalReceita,
  calcularPrecoUnitarioInsumo,
  calcularPrecoVendaPorMargem,
  calcularPrecoVendaPorMarkup,
  calcularCustoPorFatia,
  converterMedidaParaBase,
} from '@/utils/calculations';
import { parsePtNumber } from '@/utils/units';

const sugar: Insumo = {
  id: 'a1',
  nome: 'Açúcar',
  categoria: 'ingrediente',
  quantidadeComprada: 1,
  unidadeCompra: 'kg',
  precoPago: 5,
  conversoes: [
    {
      id: 'c1',
      unidadeOrigem: 'xicara',
      quantidadeOrigem: 1,
      unidadeDestino: 'g',
      quantidadeDestino: 200,
      updatedAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const receita: Receita = {
  id: 'r1',
  nome: 'Bolo de cenoura',
  quantidadeFatias: 10,
  ingredientes: [
    { id: 'i1', insumoId: 'a1', quantidade: 0.5, unidade: 'xicara' },
  ],
  custosExtras: 0,
  tempoPreparoMin: 30,
  tempoFornoMin: 40,
  tempoDescansoMin: 0,
  tipoForno: 'gas',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('calculos', () => {
  it('calcula custo unitario do insumo com base em kg', () => {
    expect(calcularPrecoUnitarioInsumo(sugar)).toBeCloseTo(0.005, 6);
  });

  it('converte xicara para base usando conversao personalizada', () => {
    expect(converterMedidaParaBase(0.5, 'xicara', sugar)).toBeCloseTo(100, 6);
  });

  it('calcula custo de ingrediente', () => {
    const { custoIngredientes } = calcularCustoIngredientesReceita(receita, [sugar]);
    expect(custoIngredientes).toBeCloseTo(0.5, 6);
  });

  it('calcula custo indireto e total', () => {
    const custoMaoObra = calcularCustoMaoDeObra(30, 28);
    const custoForno = calcularCustoForno(40, 6, 3, 'gas');
    const perdas = calcularCustoPerdas(30, 5);
    expect(custoMaoObra).toBeCloseTo(14, 6);
    expect(custoForno).toBeCloseTo(4, 6);
    expect(perdas).toBeCloseTo(1.5, 6);
  });

  it('calcula preco por margem e markup', () => {
    expect(calcularPrecoVendaPorMargem(30, 40)).toBeCloseTo(42, 6);
    expect(calcularPrecoVendaPorMarkup(30, 25)).toBeCloseTo(37.5, 6);
  });

  it('calcula custo por fatia', () => {
    expect(calcularCustoPorFatia(50, 10)).toBeCloseTo(5, 6);
  });

  it('calcula custo total da receita', () => {
    const resultado = calcularCustoTotalReceita(
      {
        ...receita,
        ingredientes: [
          { id: 'i1', insumoId: 'a1', quantidade: 0.5, unidade: 'xicara' },
        ],
      },
      [sugar],
      {
        valorHoraMaoDeObra: 28,
        custoGásPorHora: 6,
        custoEnergiaPorHora: 3,
        percentualPerdas: 5,
        percentualMargemPadrao: 40,
        custoPadraoEmbalagem: 2,
        taxaExtraOpcional: 0,
        arredondamentoComercial: 0,
        modoPrecoPadrao: 'margem',
      }
    );

    expect(resultado.custoIngredientes).toBeCloseTo(0.5, 6);
    expect(resultado.custoMaoDeObra).toBeCloseTo(14, 6);
    expect(resultado.custoForno).toBeCloseTo(4, 6);
    expect(resultado.custoTotal).toBeCloseTo(20.525, 6);
  });

  it('aceita numeros no formato pt-BR com moeda e separadores', () => {
    expect(parsePtNumber('R$ 1.234,56')).toBeCloseTo(1234.56, 6);
    expect(parsePtNumber('12,5')).toBeCloseTo(12.5, 6);
    expect(parsePtNumber('1.234.567')).toBe(1234567);
  });

  it('usa o percentual de markup padrao quando o modo de preco e markup', () => {
    const resultado = calcularCustoTotalReceita(
      {
        ...receita,
        ingredientes: [
          { id: 'i1', insumoId: 'a1', quantidade: 0.5, unidade: 'xicara' },
        ],
      },
      [sugar],
      {
        valorHoraMaoDeObra: 28,
        custoGásPorHora: 6,
        custoEnergiaPorHora: 3,
        percentualPerdas: 5,
        percentualMargemPadrao: 40,
        percentualMarkupPadrao: 25,
        custoPadraoEmbalagem: 2,
        taxaExtraOpcional: 0,
        arredondamentoComercial: 0,
        modoPrecoPadrao: 'markup',
      }
    );

    expect(resultado.precoVendaPorMarkup).toBeCloseTo(resultado.custoTotal * 1.25, 6);
    expect(resultado.precoSugerido).toBeCloseTo(resultado.precoVendaPorMarkup, 6);
  });
});
