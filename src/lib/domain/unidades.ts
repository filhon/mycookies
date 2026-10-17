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

/** "Os produtos medem Açúcar em gramas" (spec 188). */
export const PLURAL_UNIDADE_BASE: Record<UnidadeBase, string> = {
  g: "gramas",
  ml: "mililitros",
  un: "unidades",
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

/**
 * O que falta, dito como se compra (`#d300`): ninguém leva 0,59 ml.
 *
 * Arredonda **para cima**, porque para baixo promete menos do que a receita
 * pede: abaixo de 100, o inteiro; de 100 a 999, a dezena; em kg e l, uma casa.
 * 1388 g → "1,4 kg" · 10,59 ml → "11 ml" · 376,67 g → "380 g" · 3,2 un → "4 un"
 */
export function quantidadeParaOMercado(
  quantidadeBase: number,
  unidadeBase: UnidadeBase,
): string {
  const passo =
    unidadeBase === "un" || quantidadeBase < 100
      ? 1
      : quantidadeBase < 1000
        ? 10
        : 100;
  // A folga engole o resto de ponto flutuante: 300,0000001 g continua 300 g.
  const acima = Math.ceil((quantidadeBase - 1e-6) / passo) * passo;
  return formatarQuantidade(acima, unidadeBase);
}

/**
 * O custo no número da etiqueta da gôndola (`#d220`): o quilo, o litro ou a
 * unidade. O do quilo e o do litro saem em centavos inteiros; o da unidade
 * continua fracionário (luva a R$ 0,0875).
 * 1.495 centavo/g → { centavos: 1495, rotulo: "o quilo" }
 */
export function custoDeReferencia(
  custoPorBase: number,
  unidadeBase: UnidadeBase,
): { centavos: number; rotulo: "o quilo" | "o litro" | "a unidade" } {
  if (unidadeBase === "un")
    return { centavos: custoPorBase, rotulo: "a unidade" };
  return {
    centavos: Math.round(custoPorBase * 1000),
    rotulo: unidadeBase === "g" ? "o quilo" : "o litro",
  };
}

/**
 * A pergunta que dá o fator da troca de unidade de conta (spec 191), e a
 * unidade da resposta. Para `un` a pergunta vira do avesso: ninguém sabe
 * quantas unidades de ovo cabem num grama, mas sabe quanto pesa um ovo.
 * Quem lê a resposta é `fatorDaConversao`.
 */
export function perguntaDaConversao(
  de: UnidadeBase,
  para: UnidadeBase,
  nome: string,
): { texto: string; unidade: UnidadeBase } {
  const verbo = (unidade: UnidadeBase) =>
    unidade === "g" ? "pesa quantos gramas" : "tem quantos mililitros";
  if (de === "un")
    return { texto: `Uma unidade de ${nome} ${verbo(para)}?`, unidade: para };
  if (para === "un")
    return { texto: `Uma unidade de ${nome} ${verbo(de)}?`, unidade: de };
  return { texto: `1 ${de} de ${nome} ${verbo(para)}?`, unidade: para };
}

/** Quanto vale uma da unidade atual na nova, a partir da resposta. */
export function fatorDaConversao(para: UnidadeBase, resposta: number): number {
  return para === "un" ? 1 / resposta : resposta;
}

/**
 * Duas casas em `g` e `ml`; inteiro para cima em `un`, porque meia unidade não
 * se compra. A folga engole o resto de ponto flutuante (100,0000001 un é 100).
 */
export function arredondarNaBase(
  quantidade: number,
  base: UnidadeBase,
): number {
  if (base === "un") return Math.ceil(quantidade - 1e-6);
  return Math.round(quantidade * 100) / 100;
}

interface ItemMedido {
  insumoId: string;
  quantidade: number;
  unidadeBase: UnidadeBase;
}

/**
 * Tudo que guarda quantidade do material na base antiga, na nova (spec 191):
 * os itens de cada receita, a despensa e a embalagem. Só converte o item que
 * está na base do material: o que já está na nova (o açúcar quebrado da 188)
 * fica como está. O preço não muda: a mesma conta, noutra unidade.
 */
export function converterUnidadeDeConta<I extends ItemMedido>(
  fator: number,
  material: {
    id: string;
    unidadeBase: UnidadeBase;
    quantidadeBase: number;
    estoqueAtual?: number;
  },
  para: UnidadeBase,
  receitas: { itens: I[] }[],
): {
  itens: I[][];
  estoqueAtual?: number;
  embalagem: { quantidadeCompra: number; unidadeCompra: UnidadeCompra };
} {
  const converter = (quantidade: number) =>
    arredondarNaBase(quantidade * fator, para);
  return {
    itens: receitas.map((receita) =>
      receita.itens.map((item) =>
        item.insumoId === material.id &&
        item.unidadeBase === material.unidadeBase
          ? {
              ...item,
              quantidade: converter(item.quantidade),
              unidadeBase: para,
            }
          : item,
      ),
    ),
    ...(material.estoqueAtual !== undefined && material.estoqueAtual !== null
      ? { estoqueAtual: converter(material.estoqueAtual) }
      : {}),
    embalagem: {
      quantidadeCompra: converter(material.quantidadeBase),
      unidadeCompra: para,
    },
  };
}

/** Unidades de medida compatíveis para digitar uma quantidade de receita. */
export function unidadesCompativeis(unidadeBase: UnidadeBase): UnidadeCompra[] {
  if (unidadeBase === "g") return ["g", "kg"];
  if (unidadeBase === "ml") return ["ml", "l"];
  return ["un"];
}
