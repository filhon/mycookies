import type { UnidadeBase } from "@/lib/types";

/**
 * O modo de preparo é texto, um passo por linha (`DECISOES.md#d342`): colado
 * do caderno ou do WhatsApp, sem lista de campos. Linha em branco não é passo,
 * e o `\r` do que veio do Windows sai junto com o espaço das pontas.
 */
export function passosDoPreparo(texto: string | undefined): string[] {
  if (!texto) return [];
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

/** As fornadas que a bancada oferece (`DECISOES.md#d343`). */
export const FORNADAS_DA_BANCADA = [0.5, 1, 2, 3] as const;

/**
 * Arredonda para o passo da unidade: grama e mililitro inteiros, `un` de meio
 * em meio (não se quebra um ovo em terços). Abaixo de 10 g ou ml fica uma
 * casa: o fermento de 2,5 g não vira 3 g nem com a fornada de sempre. O que
 * tem quantidade nunca arredonda para zero, porque zero é ingrediente pulado.
 */
function noPasso(quantidade: number, unidadeBase: UnidadeBase): number {
  const passo = unidadeBase === "un" ? 0.5 : quantidade < 10 ? 0.1 : 1;
  const arredondada = Number(
    (Math.round(quantidade / passo) * passo).toFixed(1),
  );
  return quantidade > 0 ? Math.max(passo, arredondada) : 0;
}

/**
 * 1120 g → "1.120 g", e não "1,12 kg": ela pesa em gramas na balança, e é na
 * unidade da receita que a quantidade é lida (`#d343`). 1,5 un → "1 ½ un".
 */
export function quantidadeNaBancada(
  quantidade: number,
  unidadeBase: UnidadeBase,
): string {
  if (unidadeBase === "un") {
    const inteiro = Math.floor(quantidade);
    const meio = quantidade - inteiro >= 0.5;
    if (!meio) return `${inteiro} un`;
    return inteiro === 0 ? "½ un" : `${inteiro} ½ un`;
  }
  return `${quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidadeBase}`;
}

/**
 * A receita vezes as fornadas, no passo de cada unidade. A quantidade continua
 * na unidade base, que é a que o editor mostra e a que ela digitou.
 */
export function escalarItens<
  T extends { quantidade: number; unidadeBase: UnidadeBase },
>(itens: readonly T[], fator: number): (T & { rotulo: string })[] {
  return itens.map((item) => {
    const quantidade = noPasso(item.quantidade * fator, item.unidadeBase);
    return {
      ...item,
      quantidade,
      rotulo: quantidadeNaBancada(quantidade, item.unidadeBase),
    };
  });
}
