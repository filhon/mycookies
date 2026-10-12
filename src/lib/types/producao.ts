import type { DataISO, DocumentoBase } from "./common";
import type { UnidadeRendimento } from "./fichas";

/**
 * A fornada: um lote da ficha, a massa feita num dia (`#d93`). É o primeiro
 * fato de produção que o sistema enxerga (`DECISOES.md#d86`).
 *
 * Ela **não escreve `Insumo.estoqueAtual`**. A contagem continua sendo a
 * verdade; a fornada é um fato datado que a tela desconta na leitura, e a
 * contagem seguinte apaga o efeito sozinha (`#d87`).
 */

export interface ConsumoDaFornada {
  insumoId: string;
  /** Snapshot: a linha continua legível se o insumo for arquivado. */
  nomeSnapshot: string;
  /** Em unidade base e **física**, já com a perda aplicada. */
  quantidade: number;
}

/**
 * O preparo que a fornada tirou do pote, em vez dos ingredientes (`#d346`).
 * Congelado como o `consumo` (`#d88`).
 */
export interface TiradoDoPote {
  /** A ficha do preparo. */
  fichaId: string;
  nomeSnapshot: string;
  /** Na unidade de rendimento do preparo: g ou ml. */
  quantidade: number;
  /**
   * Os ingredientes que o pote poupou, físicos, como no `consumo`. Não saem da
   * despensa (o preparo já tirou, na fornada dele); servem ao abate do pedido,
   * que pede esses ingredientes na explosão (`#d91`).
   */
  emIngredientes: ConsumoDaFornada[];
}

export interface Fornada extends DocumentoBase {
  fichaId: string;
  nomeSnapshot: string;
  /** Quantos lotes. Aceita fração: "meia fornada" é meia fornada. */
  lotes: number;
  /** lotes × rendimento, congelado. Em 'un', arredondado para baixo. */
  unidadesProduzidas: number;
  unidadeRendimento: UnidadeRendimento;
  /** O dia, e não o instante: a mesma razão do `#d57`. */
  dataISO: DataISO;
  /** O que ESTA fornada tirou da despensa. Congelado (`#d88`). */
  consumo: ConsumoDaFornada[];
  /** O preparo que veio do pote. Ausente em fornada sem preparo contado. */
  doPote?: TiradoDoPote[];
  /** Quando ela fez a massa para um pedido específico (`#d91`). */
  pedidoId?: string;
  observacao?: string;
  /**
   * Quantas unidades desta massa não deram para vender: quebrou, queimou,
   * grudou, saiu torta. Na unidade de rendimento, como `unidadesProduzidas`.
   *
   * **Ausente não é zero** (`DECISOES.md#d139`): é "ela não disse". Só as
   * fornadas anotadas entram na taxa de quebra do produto, e `0` é uma
   * anotação legítima — "nesta não quebrou nada".
   *
   * Dita depois do registro, porque a fornada é o dia da massa (`#d93`) e a
   * quebra é do forno. O que quebrou não devolve insumo, devolve trabalho:
   * sai do pote e volta à lista de compras, nunca à despensa (`#d140`).
   */
  perdidas?: number;
}
