export type PurchaseUnit = 'g' | 'kg' | 'ml' | 'litro' | 'unidade' | 'duzia' | 'pacote' | 'caixa';

export type RecipeUnit =
  | PurchaseUnit
  | 'xicara'
  | 'meia_xicara'
  | 'terco_xicara'
  | 'quarto_xicara'
  | 'colher_sopa'
  | 'colher_cha'
  | 'porcao_personalizada';

export type BaseUnit = 'g' | 'ml' | 'unidade';

export type FornoTipo = 'gas' | 'eletrico' | 'industrial' | 'outro';

export interface ConversaoInsumo {
  id: string;
  unidadeOrigem: RecipeUnit;
  quantidadeOrigem: number;
  unidadeDestino: BaseUnit;
  quantidadeDestino: number;
  observacoes?: string;
  updatedAt: string;
}

export interface Insumo {
  id: string;
  nome: string;
  categoria: string;
  quantidadeComprada: number;
  unidadeCompra: PurchaseUnit;
  precoPago: number;
  rendimentoBase?: number;
  unidadeBaseCalculada?: BaseUnit;
  observacoes?: string;
  conversoes: ConversaoInsumo[];
  createdAt: string;
  updatedAt: string;
}

export interface IngredienteReceita {
  id: string;
  insumoId: string;
  quantidade: number;
  unidade: RecipeUnit;
  observacoes?: string;
}

export interface Receita {
  id: string;
  nome: string;
  descricao?: string;
  tamanhoOuRendimento?: string;
  quantidadeFatias: number;
  pesoAproximadoFinal?: number;
  ingredientes: IngredienteReceita[];
  custosExtras: number;
  custoEmbalagem?: number;
  tempoPreparoMin: number;
  tempoFornoMin: number;
  tempoDescansoMin: number;
  temperaturaForno?: number;
  tipoForno: FornoTipo;
  observacoes?: string;
  margemDesejada?: number;
  taxaExtraOpcional?: number;
  arredondamentoComercial?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Configuracoes {
  valorHoraMaoDeObra: number;
  custoGásPorHora: number;
  custoEnergiaPorHora: number;
  percentualPerdas: number;
  percentualMargemPadrao: number;
  percentualMarkupPadrao?: number;
  custoPadraoEmbalagem: number;
  taxaExtraOpcional: number;
  arredondamentoComercial: number;
  modoPrecoPadrao: 'margem' | 'markup';
}

export interface ResultadoItemIngrediente {
  ingredienteId: string;
  insumoId: string;
  nomeInsumo: string;
  quantidade: number;
  unidade: RecipeUnit;
  quantidadeBase: number;
  unidadeBase: BaseUnit;
  custoUnitarioBase: number;
  custo: number;
  observacao?: string;
  aviso?: string;
}

export interface ResultadoCusto {
  itens: ResultadoItemIngrediente[];
  avisos: string[];
  custoIngredientes: number;
  custoEmbalagem: number;
  custoMaoDeObra: number;
  custoForno: number;
  custoPerdas: number;
  custoExtras: number;
  custoTotal: number;
  custoPorFatia: number;
  precoVendaPorMargem: number;
  precoVendaPorMarkup: number;
  precoSugerido: number;
  precoPorFatia: number;
  lucroEstimado: number;
  margemAplicada: number;
}

export interface AppState {
  insumos: Insumo[];
  receitas: Receita[];
  configuracoes: Configuracoes;
  updatedAt: string;
}

export interface BackupPayload {
  appName: string;
  version: number;
  exportedAt: string;
  state: AppState;
}

export const DEFAULT_CONFIGURACOES: Configuracoes = {
  valorHoraMaoDeObra: 28,
  custoGásPorHora: 6,
  custoEnergiaPorHora: 3.5,
  percentualPerdas: 5,
  percentualMargemPadrao: 40,
  percentualMarkupPadrao: 40,
  custoPadraoEmbalagem: 2.5,
  taxaExtraOpcional: 0,
  arredondamentoComercial: 0.5,
  modoPrecoPadrao: 'margem',
};
