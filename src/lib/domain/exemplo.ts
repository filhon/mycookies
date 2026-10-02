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

/** O que um bolo leva por inteiro, pese o que pesar: caixa, base e o tempo de decorar. */
export const POR_BOLO = {
  custoEmbalagem: 1300,
  custoMaoDeObra: 2000,
  custoIndireto: 200,
} as const;

/** O que cresce com o peso: massa, recheio, cobertura, o forno e o tempo de cada camada. */
export const POR_QUILO = {
  custoInsumos: 2800,
  custoMaoDeObra: 1500,
  custoEnergiaGas: 300,
  custoIndireto: 100,
} as const;

/**
 * O bolo de brigadeiro com ninho de `quilos` kg (spec 068, `DECISOES.md#d258`).
 * A unidade de venda é o quilo: `rende` são os quilos, e `custoUnitario` o
 * custo de um quilo. A parte fixa por bolo é o que faz o quilo do bolo pequeno
 * custar mais. A única soma de exemplo que precisa de função.
 */
export function boloDe(quilos: number): ExemploDePagina {
  const custo = {
    custoInsumos: POR_QUILO.custoInsumos * quilos,
    custoEmbalagem: POR_BOLO.custoEmbalagem,
    custoComponentes: 0,
    custoEscolhas: 0,
    custoMaoDeObra: POR_BOLO.custoMaoDeObra + POR_QUILO.custoMaoDeObra * quilos,
    custoEnergiaGas: POR_QUILO.custoEnergiaGas * quilos,
    custoIndireto: POR_BOLO.custoIndireto + POR_QUILO.custoIndireto * quilos,
  };
  const custoTotalLote =
    custo.custoInsumos +
    custo.custoEmbalagem +
    custo.custoMaoDeObra +
    custo.custoEnergiaGas +
    custo.custoIndireto;
  return {
    nome: "Bolo de brigadeiro com ninho",
    rende: quilos,
    custo: {
      ...custo,
      custoTotalLote,
      custoUnitario: Math.round(custoTotalLote / quilos),
    },
    parametros: EXEMPLO.parametros,
    /** O quilo "pelo preço da padaria". */
    precoPraticado: 10000,
  };
}

/** O tempo do lote de potes e o valor da hora: assar uma vez, montar dez. */
export const HORA_DO_BOLO_DE_POTE = { minutos: 90, valor: 2000 } as const;

/**
 * O bolo de pote (spec 068, `DECISOES.md#d258`). O lote é de 10 potes, e a
 * unidade de venda é o pote. A embalagem (pote, tampa, colher e etiqueta, R$
 * 1,45 cada) é a parcela que mais engana. Parâmetros do cookie: o balcão.
 */
export const EXEMPLO_BOLO_DE_POTE = {
  nome: "Bolo de pote de ninho com morango",
  rende: 10,
  /** Massa, creme e fruta; dez potes montados; o forno; as fixas. */
  custo: {
    custoInsumos: 4200,
    custoEmbalagem: 1450,
    custoComponentes: 0,
    custoEscolhas: 0,
    custoMaoDeObra:
      (HORA_DO_BOLO_DE_POTE.minutos / 60) * HORA_DO_BOLO_DE_POTE.valor,
    custoEnergiaGas: 250,
    custoIndireto: 200,
    custoTotalLote: 9100,
    custoUnitario: 910,
  },
  parametros: EXEMPLO.parametros,
  /** O pote "pelo preço da feira". */
  precoPraticado: 1500,
} as const satisfies ExemploDePagina;

/**
 * O mesmo pote vendido por aplicativo de entrega: a maquininha sai, porque
 * quem cobra é o aplicativo, e a comissão e o pagamento online entram somados
 * em `outrasTaxas`. Os 20% são número de exemplo, de nenhuma empresa.
 */
export const NO_APLICATIVO = {
  ...EXEMPLO.parametros,
  taxaCartaoConsiderada: 0,
  outrasTaxas: 20,
} as const satisfies ParametrosPreco;

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
