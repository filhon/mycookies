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
  /** Quando ela fez a massa para um pedido específico (`#d91`). */
  pedidoId?: string;
  observacao?: string;
}
