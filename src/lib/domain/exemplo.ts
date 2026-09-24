import type { CustoFichaCalculado } from "./custoFicha";
import type { ParametrosPreco } from "./precificacao";

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
} as const;

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
