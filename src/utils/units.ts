import type { BaseUnit, PurchaseUnit, RecipeUnit } from '@/types';

export const PURCHASE_UNITS: { value: PurchaseUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'litro', label: 'litro' },
  { value: 'ml', label: 'ml' },
  { value: 'unidade', label: 'unidade' },
  { value: 'duzia', label: 'dúzia' },
  { value: 'pacote', label: 'pacote' },
  { value: 'caixa', label: 'caixa' },
];

export const RECIPE_UNITS: { value: RecipeUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'litro', label: 'litro' },
  { value: 'unidade', label: 'unidade' },
  { value: 'duzia', label: 'dúzia' },
  { value: 'xicara', label: 'xícara' },
  { value: 'meia_xicara', label: '1/2 xícara' },
  { value: 'terco_xicara', label: '1/3 xícara' },
  { value: 'quarto_xicara', label: '1/4 xícara' },
  { value: 'colher_sopa', label: 'colher de sopa' },
  { value: 'colher_cha', label: 'colher de chá' },
  { value: 'pacote', label: 'pacote' },
  { value: 'caixa', label: 'caixa' },
  { value: 'porcao_personalizada', label: 'porção personalizada' },
];

export const BASE_UNIT_LABELS: Record<BaseUnit, string> = {
  g: 'g',
  ml: 'ml',
  unidade: 'unidade',
};

const UNIT_GROUPS: Record<RecipeUnit, { base: RecipeUnit; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  litro: { base: 'ml', factor: 1000 },
  unidade: { base: 'unidade', factor: 1 },
  duzia: { base: 'unidade', factor: 12 },
  pacote: { base: 'pacote', factor: 1 },
  caixa: { base: 'caixa', factor: 1 },
  xicara: { base: 'xicara', factor: 1 },
  meia_xicara: { base: 'xicara', factor: 0.5 },
  terco_xicara: { base: 'xicara', factor: 1 / 3 },
  quarto_xicara: { base: 'xicara', factor: 0.25 },
  colher_sopa: { base: 'colher_sopa', factor: 1 },
  colher_cha: { base: 'colher_cha', factor: 1 },
  porcao_personalizada: { base: 'porcao_personalizada', factor: 1 },
};

export function isFractionalCup(unit: RecipeUnit): unit is 'meia_xicara' | 'terco_xicara' | 'quarto_xicara' {
  return unit === 'meia_xicara' || unit === 'terco_xicara' || unit === 'quarto_xicara';
}

export function normalizeRecipeUnit(unit: RecipeUnit | string): { base: RecipeUnit; factor: number } {
  return UNIT_GROUPS[unit as RecipeUnit] ?? { base: 'porcao_personalizada', factor: 1 };
}

export function directBaseFromPurchaseUnit(unit: PurchaseUnit): BaseUnit | null {
  switch (unit) {
    case 'g':
    case 'kg':
      return 'g';
    case 'ml':
    case 'litro':
      return 'ml';
    case 'unidade':
    case 'duzia':
      return 'unidade';
    default:
      return null;
  }
}

export function purchaseUnitToBaseFactor(unit: PurchaseUnit): number | null {
  switch (unit) {
    case 'g':
      return 1;
    case 'kg':
      return 1000;
    case 'ml':
      return 1;
    case 'litro':
      return 1000;
    case 'unidade':
      return 1;
    case 'duzia':
      return 12;
    default:
      return null;
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDecimalBR(
  value: number,
  maximumFractionDigits = 2,
  minimumFractionDigits = 0
): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumberBR(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function parsePtNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const cleaned = value
    .toString()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!cleaned) {
    return 0;
  }

  const negative = cleaned.startsWith('-') ? '-' : '';
  const unsigned = cleaned.replace(/-/g, '');
  const commaCount = (unsigned.match(/,/g) || []).length;
  const dotCount = (unsigned.match(/\./g) || []).length;

  let normalized = unsigned;
  if (commaCount && dotCount) {
    const decimalSeparatorIndex = Math.max(unsigned.lastIndexOf(','), unsigned.lastIndexOf('.'));
    const integerPart = unsigned.slice(0, decimalSeparatorIndex).replace(/[.,]/g, '');
    const fractionalPart = unsigned.slice(decimalSeparatorIndex + 1).replace(/[.,]/g, '');
    normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  } else if (commaCount) {
    if (commaCount > 1) {
      const lastCommaIndex = unsigned.lastIndexOf(',');
      const integerPart = unsigned.slice(0, lastCommaIndex).replace(/,/g, '');
      const fractionalPart = unsigned.slice(lastCommaIndex + 1).replace(/,/g, '');
      normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
    } else {
      normalized = unsigned.replace(',', '.');
    }
  } else if (dotCount > 1) {
    normalized = unsigned.replace(/\./g, '');
  }

  const parsed = Number(`${negative}${normalized}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundToStep(value: number, step: number): number {
  if (!step || step <= 0) {
    return value;
  }

  return Math.ceil(value / step) * step;
}

export function unitLabel(unit: string): string {
  const found =
    PURCHASE_UNITS.find((item) => item.value === unit) ||
    RECIPE_UNITS.find((item) => item.value === unit);

  return found?.label ?? unit;
}
