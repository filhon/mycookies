import type {
  Centavos,
  CentavosFracionados,
  Percentual,
  UnidadeBase,
  UnidadeCompra,
} from "@/lib/types";
import { paraBase, unidadeBaseDe } from "./unidades";

export interface EntradaCustoInsumo {
  precoCompra: Centavos;
  quantidadeCompra: number;
  unidadeCompra: UnidadeCompra;
  /** Quebra, casca, aparas, sobra na tigela. 0 a 99. */
  perdaPercentual: Percentual;
}

export interface CustoInsumoCalculado {
  unidadeBase: UnidadeBase;
  quantidadeBase: number;
  custoUnidadeBase: CentavosFracionados;
  custoUnidadeBaseCorrigido: CentavosFracionados;
  /** Quanto a perda custa por embalagem comprada. Serve para mostrar à usuária. */
  custoDaPerda: Centavos;
  /** Quantidade que sobra de fato para usar, depois da perda. */
  rendimentoLiquido: number;
}

export const PERDA_MAXIMA = 99;

/**
 * Converte "paguei R$ 12,50 em 1 kg de farinha e perco 5% na peneira" em
 * "cada grama aproveitada me custa 1,3158 centavo".
 *
 * O fator de correção divide, não multiplica: se 5% se perde, os 100% do preço
 * são pagos por 95% de produto útil. Multiplicar por 1,05 subestima o custo, e
 * é o erro mais comum em planilha de confeitaria.
 */
export function calcularCustoInsumo(
  entrada: EntradaCustoInsumo,
): CustoInsumoCalculado {
  const { precoCompra, quantidadeCompra, unidadeCompra } = entrada;
  const perdaPercentual = Math.min(
    Math.max(entrada.perdaPercentual || 0, 0),
    PERDA_MAXIMA,
  );

  const unidadeBase = unidadeBaseDe(unidadeCompra);
  const quantidadeBase = paraBase(quantidadeCompra, unidadeCompra);

  if (!quantidadeBase || quantidadeBase <= 0) {
    return {
      unidadeBase,
      quantidadeBase: 0,
      custoUnidadeBase: 0,
      custoUnidadeBaseCorrigido: 0,
      custoDaPerda: 0,
      rendimentoLiquido: 0,
    };
  }

  const custoUnidadeBase = precoCompra / quantidadeBase;
  const fatorAproveitamento = 1 - perdaPercentual / 100;
  const custoUnidadeBaseCorrigido = custoUnidadeBase / fatorAproveitamento;
  const rendimentoLiquido = quantidadeBase * fatorAproveitamento;

  return {
    unidadeBase,
    quantidadeBase,
    custoUnidadeBase,
    custoUnidadeBaseCorrigido,
    custoDaPerda: Math.round(
      precoCompra - rendimentoLiquido * custoUnidadeBase,
    ),
    rendimentoLiquido,
  };
}

/** Custo de usar `quantidade` (em unidade base) de um insumo já calculado. */
export function custoDeUso(
  custoUnidadeBaseCorrigido: CentavosFracionados,
  quantidade: number,
): Centavos {
  return Math.round(custoUnidadeBaseCorrigido * quantidade);
}

/** Normaliza nome para busca offline: minúsculo, sem acento, sem espaço duplo. */
export function chaveDeBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
