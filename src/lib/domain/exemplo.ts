import type { Centavos } from "@/lib/types";
import type { CustoFichaCalculado } from "./custoFicha";
import type { ParametrosPreco } from "./precificacao";

/** O que uma página pública mostra de um doce: a `ContaAberta` lê isto. */
export interface ExemploDePagina {
  nome: string;
  rende: number;
  custo: CustoFichaCalculado;
  parametros: ParametrosPreco;
  precoPraticado: Centavos;
}

/**
 * O cookie da página de venda (`DECISOES.md#d173`). Números do `MARCA.md`
 * § 1.1, com a margem corrigida: 40% + maquininha 5% é o que chega a R$ 8,50.
 * A página mostra o que as funções do app devolvem para este objeto, e
 * `tests/domain/exemplo.test.ts` prende o resultado: se a regra de preço
 * mudar, o teste quebra antes de a página mentir.
 */
export const EXEMPLO = {
  nome: "Cookie recheado",
  rende: 24,
  /** O lote inteiro, em centavos; por unidade: 3,12 · 0,45 · 0,56 · 0,18 · 0,10 = 4,41. */
  custo: {
    custoInsumos: 7488,
    custoEmbalagem: 1080,
    custoComponentes: 0,
    custoEscolhas: 0,
    custoMaoDeObra: 1344,
    custoEnergiaGas: 432,
    custoIndireto: 240,
    custoTotalLote: 10584,
    custoUnitario: 441,
  } satisfies CustoFichaCalculado,
  parametros: {
    metodo: "MARGEM",
    margemDesejada: 40,
    taxaCartaoConsiderada: 5,
    outrasTaxas: 0,
    markup: 2.5,
    arredondamento: "MEIO_REAL",
  } satisfies ParametrosPreco,
  precoPraticado: 800,
} as const satisfies ExemploDePagina;

/** As horas do cento e o valor da hora: o trabalho é a maior parcela do brigadeiro. */
export const HORA_DO_BRIGADEIRO = { horas: 2, valor: 2000 } as const;

/**
 * O cento de brigadeiro (spec 068, `DECISOES.md#d258`). O lote é o cento, e
 * não a receita: ninguém vende um brigadeiro de R$ 1,77, vende o cento. Com
 * `rende: 1`, a `ContaAberta` mostra as parcelas e o preço do cento sem
 * dividir e remultiplicar por 100. Parâmetros do cookie.
 */
export const EXEMPLO_BRIGADEIRO = {
  nome: "Cento de brigadeiro tradicional",
  rende: 1,
  /** Quatro receitas, cem forminhas e a caixa, as duas horas, o fogão, as fixas. */
  custo: {
    custoInsumos: 4200,
    custoEmbalagem: 600,
    custoComponentes: 0,
    custoEscolhas: 0,
    custoMaoDeObra: HORA_DO_BRIGADEIRO.horas * HORA_DO_BRIGADEIRO.valor,
    custoEnergiaGas: 400,
    custoIndireto: 500,
    custoTotalLote: 9700,
    custoUnitario: 9700,
  },
  parametros: EXEMPLO.parametros,
  /** O cento "pelo preço da vizinha". */
  precoPraticado: 15000,
} as const satisfies ExemploDePagina;

/**
 * "Custo + 45%": a margem e a maquininha do `EXEMPLO` somadas em cima do
 * custo, o erro que `/como-calcular-o-preco-do-cookie` mostra (spec 037). É o
 * markup do app sem arredondar, para o número ser o custo × 1,45 da
 * calculadora de quem faz a conta assim.
 */
export const ERRO_COMUM = {
  ...EXEMPLO.parametros,
  metodo: "MARKUP",
  markup:
    1 +
    (EXEMPLO.parametros.margemDesejada +
      EXEMPLO.parametros.taxaCartaoConsiderada) /
      100,
  arredondamento: "NENHUM",
} as const satisfies ParametrosPreco;
