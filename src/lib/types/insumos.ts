import type { Timestamp } from "firebase/firestore";
import type {
  Centavos,
  CentavosFracionados,
  DocumentoBase,
  Percentual,
  UnidadeBase,
  UnidadeCompra,
} from "./common";

/**
 * Ingredientes e embalagens vivem na MESMA coleção.
 * Motivo: o comportamento de custo é idêntico (preço de compra → custo por
 * unidade base) e uma coleção única significa um motor de cálculo, uma tela de
 * cadastro e uma leitura só para popular o app inteiro.
 */
export type CategoriaInsumo =
  "INGREDIENTE" | "EMBALAGEM" | "ETIQUETA" | "ARMAZENAMENTO" | "OUTRO";

export interface HistoricoPreco {
  data: Timestamp;
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  custoUnidadeBase: CentavosFracionados;
  fornecedor?: string;
}

export interface Insumo extends DocumentoBase {
  nome: string;
  /** nome em minúsculas e sem acento — habilita busca por prefixo e filtro offline. */
  nomeBusca: string;
  categoria: CategoriaInsumo;
  marca?: string;
  fornecedor?: string;

  // ---- Como se compra (entrada do usuário) ----
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;

  // ---- Normalização (derivado, mas GRAVADO) ----
  // Gravamos o derivado para que ficha técnica e lista de compras nunca
  // precisem reprocessar conversão em tempo de leitura.
  unidadeBase: UnidadeBase;
  /** quantidadeCompra convertida para unidadeBase. Ex.: 1 kg → 1000 g. */
  quantidadeBase: number;
  /** precoCompra / quantidadeBase. Ex.: R$ 12,50 / 1000 g = 1,25 centavo/g. */
  custoUnidadeBase: CentavosFracionados;

  /**
   * Perda/quebra do insumo: casca, aparas, sobra na tigela, evaporação.
   * É o "fator de correção" da gastronomia.
   */
  perdaPercentual: Percentual;
  /** custoUnidadeBase / (1 - perdaPercentual/100). É ESTE o custo usado nas receitas. */
  custoUnidadeBaseCorrigido: CentavosFracionados;

  // ---- Estoque (opcional, alimenta a lista de compras) ----
  estoqueAtual?: number;
  estoqueMinimo?: number;
  ultimaCompraEm?: Timestamp;

  /**
   * Últimas 12 compras embutidas no próprio documento.
   * Array com teto em vez de subcoleção: o gráfico "preço da farinha subiu?"
   * sai de graça na mesma leitura, sem N reads extras.
   */
  historicoPrecos: HistoricoPreco[];
}
