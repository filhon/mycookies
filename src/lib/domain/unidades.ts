import {
  CONVERSAO_UNIDADE,
  type UnidadeBase,
  type UnidadeCompra,
} from "@/lib/types";

export const ROTULO_UNIDADE_COMPRA: Record<UnidadeCompra, string> = {
  kg: "quilo",
  g: "grama",
  l: "litro",
  ml: "mililitro",
  un: "unidade",
};

export const ROTULO_UNIDADE_BASE: Record<UnidadeBase, string> = {
  g: "grama",
  ml: "mililitro",
  un: "unidade",
};

/** Unidades de compra oferecidas, agrupadas por grandeza. */
export const GRUPOS_UNIDADE: { grandeza: string; unidades: UnidadeCompra[] }[] =
  [
    { grandeza: "Peso", unidades: ["kg", "g"] },
    { grandeza: "Volume", unidades: ["l", "ml"] },
    { grandeza: "Contagem", unidades: ["un"] },
  ];

export function unidadeBaseDe(unidade: UnidadeCompra): UnidadeBase {
  return CONVERSAO_UNIDADE[unidade].base;
}

/** 1 kg → 1000 g */
export function paraBase(quantidade: number, unidade: UnidadeCompra): number {
  return quantidade * CONVERSAO_UNIDADE[unidade].fator;
}

/** 1500 g, comprado em kg → 1.5 */
export function daBase(quantidadeBase: number, unidade: UnidadeCompra): number {
  return quantidadeBase / CONVERSAO_UNIDADE[unidade].fator;
}

/**
 * Escreve a quantidade na maior unidade que ainda deixa o número legível.
 * 1500 g → "1,5 kg" · 250 g → "250 g" · 3 un → "3 un"
 */
export function formatarQuantidade(
  quantidadeBase: number,
  unidadeBase: UnidadeBase,
): string {
  const numero = (valor: number, casas = 2) =>
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: casas,
    });

  if (unidadeBase === "un") return `${numero(quantidadeBase, 0)} un`;

  const grande = unidadeBase === "g" ? "kg" : "l";
  if (Math.abs(quantidadeBase) >= 1000) {
    return `${numero(quantidadeBase / 1000, 3)} ${grande}`;
  }
  return `${numero(quantidadeBase)} ${unidadeBase}`;
}

/** Unidades de medida compatíveis para digitar uma quantidade de receita. */
export function unidadesCompativeis(unidadeBase: UnidadeBase): UnidadeCompra[] {
  if (unidadeBase === "g") return ["g", "kg"];
  if (unidadeBase === "ml") return ["ml", "l"];
  return ["un"];
}
