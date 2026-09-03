import type { CategoriaInsumo } from "@/lib/types";

/**
 * A ordem em que se anda no mercado.
 *
 * Mora em módulo próprio porque **dois módulos a usam e um deles não pode
 * importar o outro**: `listaCompras.ts` ordena o carrinho por corredor, e
 * `estoque.ts` ordena a contagem pelo mesmo critério — contar é ato de compra, e
 * a despensa se percorre na mesma ordem da gôndola. Desde a 7B `listaCompras`
 * importa `estoqueParaLista` de `estoque`, e deixar o corredor onde estava
 * fecharia um ciclo entre os dois.
 *
 * A ordem não é a alfabética das categorias: ingrediente primeiro porque é o
 * grosso do carrinho; embalagem e etiqueta depois, que é onde elas ficam; o
 * resto no fim.
 */

export const ORDEM_CATEGORIA_COMPRA: CategoriaInsumo[] = [
  "INGREDIENTE",
  "EMBALAGEM",
  "ETIQUETA",
  "ARMAZENAMENTO",
  "OUTRO",
];

export const ROTULO_CORREDOR: Record<CategoriaInsumo, string> = {
  INGREDIENTE: "Ingredientes",
  EMBALAGEM: "Embalagens",
  ETIQUETA: "Etiquetas",
  ARMAZENAMENTO: "Armazenamento",
  OUTRO: "Outros",
};

function posicaoNoMercado(categoria: CategoriaInsumo): number {
  const posicao = ORDEM_CATEGORIA_COMPRA.indexOf(categoria);
  return posicao === -1 ? ORDEM_CATEGORIA_COMPRA.length : posicao;
}

/** Corredor primeiro, nome depois. É a ordem de quem empurra o carrinho. */
export function compararParaOMercado(
  a: { categoria: CategoriaInsumo; nome: string },
  b: { categoria: CategoriaInsumo; nome: string },
): number {
  const corredor =
    posicaoNoMercado(a.categoria) - posicaoNoMercado(b.categoria);
  return corredor !== 0 ? corredor : a.nome.localeCompare(b.nome);
}

export interface CorredorDoMercado<T> {
  categoria: CategoriaInsumo;
  itens: T[];
}

/** Os itens reunidos por corredor, na ordem em que ela passa por eles. */
export function agruparPorCorredor<
  T extends { categoria: CategoriaInsumo; nome: string },
>(itens: T[]): CorredorDoMercado<T>[] {
  const grupos = new Map<CategoriaInsumo, T[]>();

  for (const item of [...itens].sort(compararParaOMercado)) {
    const corredor = grupos.get(item.categoria);
    if (corredor) corredor.push(item);
    else grupos.set(item.categoria, [item]);
  }

  return [...grupos.entries()].map(([categoria, lista]) => ({
    categoria,
    itens: lista,
  }));
}
