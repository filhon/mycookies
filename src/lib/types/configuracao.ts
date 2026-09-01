import type { Timestamp } from "firebase/firestore";
import type { Centavos, Percentual, VersaoSchema } from "./common";

/** Método de precificação escolhido na ficha técnica. */
export type MetodoPrecificacao = "MARKUP" | "MARGEM";

/** Como o preço sugerido é arredondado para virar preço de vitrine. */
export type RegraArredondamento =
  "NENHUM" | "CENTAVO_90" | "REAL_INTEIRO" | "MEIO_REAL";

export type TipoPagamento =
  | "PIX"
  | "DINHEIRO"
  | "DEBITO"
  | "CREDITO"
  | "CREDITO_PARCELADO"
  | "TRANSFERENCIA";

export interface FormaPagamento {
  id: string;
  nome: string;
  tipo: TipoPagamento;
  /** Taxa da maquininha/gateway. Ex.: 4.99 para crédito. */
  taxaPercentual: Percentual;
  /** Taxa fixa por transação, quando houver. */
  taxaFixa: Centavos;
  prazoRecebimentoDias: number;
  ativo: boolean;
}

/**
 * Custos invisíveis. Tudo que não é insumo mas sai do bolso.
 * Alimentam o rateio de cada ficha técnica.
 */
export interface CustosOperacionais {
  /** Quanto vale 1 hora do trabalho da Maynara. */
  valorHoraTrabalho: Centavos;
  /** Horas que ela realmente produz por mês — base do rateio de despesa fixa. */
  horasProdutivasMes: number;
  custoEnergiaHora: Centavos;
  custoGasHora: Centavos;
  /** Aluguel, internet, contador, assinaturas. */
  despesasFixasMensais: Centavos;
  /** Derivado: despesasFixasMensais / horasProdutivasMes. Gravado para uso direto. */
  custoIndiretoPorHora: Centavos;
}

export interface PrecificacaoPadrao {
  metodoPadrao: MetodoPrecificacao;
  /** Multiplicador sobre o custo total. Ex.: 2.5. */
  markupPadrao: number;
  /** Margem de lucro líquida desejada. Ex.: 35 (%). */
  margemPadrao: Percentual;
  /** Impostos/comissões que incidem sobre o preço (Simples, marketplace). */
  outrasTaxasPadrao: Percentual;
  arredondamento: RegraArredondamento;
}

/**
 * TODA a configuração do app em UM documento:
 * `contas/{contaId}/configuracao/geral`.
 * O app inteiro sobe com 1 read, e ele fica no cache offline para sempre.
 */
export interface ConfiguracaoGeral {
  id: "geral";
  v: VersaoSchema;
  nomeNegocio: string;
  operacional: CustosOperacionais;
  precificacao: PrecificacaoPadrao;
  formasPagamento: FormaPagamento[];
  /** Categorias de produto criadas pela usuária (Cookie, Brownie, Kit...). */
  categoriasProduto: string[];
  atualizadoEm: Timestamp;
}
