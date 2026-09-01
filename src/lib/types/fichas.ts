import type { Timestamp } from "firebase/firestore";
import type {
  Centavos,
  DocumentoBase,
  Percentual,
  UnidadeBase,
} from "./common";
import type { CategoriaInsumo } from "./insumos";
import type { MetodoPrecificacao } from "./configuracao";

/**
 * SIMPLES: receita que consome insumos e rende N unidades (um lote de cookies).
 * KIT: caixa/combo que consome OUTRAS fichas simples, mais a própria embalagem.
 *
 * Um kit não pode conter outro kit. Um nível de profundidade mantém a explosão
 * de demanda da lista de compras finita e o custo auditável.
 */
export type TipoFicha = "SIMPLES" | "KIT";

export interface ComponenteKit {
  fichaId: string;
  nomeSnapshot: string;
  /** Quantas unidades desta ficha entram no kit. */
  quantidade: number;
  /** custoUnitario da ficha componente no momento do cálculo. */
  custoUnitarioSnapshot: Centavos;
  custoLinha: Centavos;
}

export interface ItemFichaTecnica {
  insumoId: string;
  /** Snapshot do nome: a linha continua legível mesmo se o insumo for arquivado. */
  nomeSnapshot: string;
  categoria: CategoriaInsumo;
  /** Quantidade na unidade base do insumo (g/ml/un). */
  quantidade: number;
  unidadeBase: UnidadeBase;
  /** quantidade × custoUnidadeBaseCorrigido, arredondado. Recalculado a cada save. */
  custoLinha: Centavos;
}

/** Os custos invisíveis já rateados para ESTE lote. */
export interface CustosInvisiveisFicha {
  tempoProducaoMinutos: number;
  /** (tempoProducaoMinutos / 60) × valorHoraTrabalho */
  custoMaoDeObra: Centavos;
  /** (tempoProducaoMinutos / 60) × (custoEnergiaHora + custoGasHora) */
  custoEnergiaGas: Centavos;
  /** (tempoProducaoMinutos / 60) × custoIndiretoPorHora */
  custoIndireto: Centavos;
}

export interface Precificacao {
  metodo: MetodoPrecificacao;
  /** Usado quando metodo === 'MARKUP'. */
  markup?: number;
  /** Usado quando metodo === 'MARGEM'. */
  margemDesejada?: Percentual;
  /** Taxa de cartão embutida no preço (senão a margem some na maquininha). */
  taxaCartaoConsiderada: Percentual;
  outrasTaxas: Percentual;

  /** Saída da calculadora, antes do arredondamento. */
  precoSugerido: Centavos;
  /** Preço praticado de fato. A usuária pode sobrescrever o sugerido. */
  precoVenda: Centavos;

  // Derivados do precoVenda REAL — é o que a usuária precisa ver na tela.
  lucroUnitario: Centavos;
  margemReal: Percentual;
  markupReal: number;
}

export interface FichaTecnica extends DocumentoBase {
  nome: string;
  nomeBusca: string;
  categoria: string;
  fotoUrl?: string;
  modoPreparo?: string;

  tipo: TipoFicha;

  /** Quantas unidades saem de UM lote desta receita (ou 1, para um kit). */
  rendimento: number;
  unidadeRendimento: "un" | "porcao" | "g" | "ml";

  /**
   * Insumos consumidos. Em uma ficha SIMPLES, ingredientes e embalagem.
   * Em um KIT, apenas a embalagem própria do kit (caixa, laço, etiqueta).
   */
  itens: ItemFichaTecnica[];
  /** Fichas que compõem o kit. Sempre vazio em ficha SIMPLES. */
  componentes: ComponenteKit[];

  /**
   * Espelho de itens[].insumoId. Existe para responder com UMA query
   * `where('insumoIds','array-contains', X)`: "quais receitas usam este insumo?"
   * — necessário para marcar fichas desatualizadas quando um preço muda.
   */
  insumoIds: string[];
  /** Espelho de componentes[].fichaId. Mesma finalidade, um nível acima. */
  componenteIds: string[];

  invisiveis: CustosInvisiveisFicha;

  // ---- Resultado do motor de custo (derivado, gravado) ----
  custoInsumos: Centavos;
  custoEmbalagem: Centavos;
  /** Soma dos componentes, em kit. Zero em ficha simples. */
  custoComponentes: Centavos;
  custoTotalLote: Centavos;
  /** custoTotalLote / rendimento. Base de toda precificação. */
  custoUnitario: Centavos;

  precificacao: Precificacao;

  custoCalculadoEm: Timestamp;
  /**
   * Marcado como true quando um insumo da receita muda de preço.
   * A UI mostra um selo "custo desatualizado" e oferece recalcular —
   * sem isso, a Maynara venderia com preço de farinha do ano passado.
   */
  custoDesatualizado: boolean;

  ativo: boolean;
}
