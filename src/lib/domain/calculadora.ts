import { z } from "zod";
import type { Centavos, Percentual } from "@/lib/types";
import { FICHAS_DA_BIBLIOTECA, INSUMOS_DA_BIBLIOTECA } from "./biblioteca";
import {
  CONFIGURACAO_SUGERIDA,
  precificacaoSugerida,
  rateioSugerido,
} from "./configuracaoSugerida";
import {
  composicaoDoLote,
  derivarFicha,
  type CustoFichaCalculado,
  type DerivadosFicha,
  type Segmento,
} from "./custoFicha";
import { calcularCustoInsumo } from "./custoInsumo";
import {
  boloDe,
  EXEMPLO,
  EXEMPLO_BOLO_DE_POTE,
  EXEMPLO_BRIGADEIRO,
  type ExemploDePagina,
} from "./exemplo";
import {
  calcularPrecoSugerido,
  type ResultadoPreco,
  somaTaxas,
  verificarPreco,
  type VerificacaoPreco,
} from "./precificacao";
import { formatarMoeda } from "./money";
import { formatarQuantidade, paraBase, unidadeBaseDe } from "./unidades";

/**
 * A calculadora pública (spec 040, `DECISOES.md#d185`): as duas receitas de
 * cookie da biblioteca, com o que muda de cozinha para cozinha editável, pelas
 * mesmas funções do app e com a configuração da conta nova (`#d186`). Nenhuma
 * aritmética nova além de `aMaisNoMes`: o resto é chamada ao que já existe, e
 * `tests/domain/calculadora.test.ts` prende que a página e o app batem.
 */

export type ReceitaDaPorta = "cookie-classico" | "cookie-recheado";

export const RECEITAS_DA_PORTA: { valor: ReceitaDaPorta; rotulo: string }[] = [
  { valor: "cookie-classico", rotulo: fichaDa("cookie-classico").nome },
  { valor: "cookie-recheado", rotulo: fichaDa("cookie-recheado").nome },
];

/** "Quantos você vende por mês" começa aqui: uma ordem de grandeza, que ela troca. */
export const VENDAS_MES_PADRAO = 100;

export interface EntradaDaPorta {
  receita: ReceitaDaPorta;
  rendimento: number;
  tempoProducaoMinutos: number;
  valorHoraTrabalho: Centavos;
  /** Preço do pacote por id de material da biblioteca, só os que ela trocou. */
  precos: Record<string, Centavos>;
  precoHoje: Centavos | null;
  vendasMes: number;
}

export interface MaterialDaPorta {
  /** O id da biblioteca, sem o prefixo. */
  id: string;
  nome: string;
  /** "200 g", "12 un": o pacote de que o preço fala. */
  embalagem: string;
  /** O preço que a conta usou: o dela, ou o médio quando ela deixou vazio. */
  preco: Centavos;
  /** O preço médio da biblioteca. */
  padrao: Centavos;
}

export interface ContaDaPorta {
  derivados: DerivadosFicha;
  segmentos: Segmento[];
  materiais: MaterialDaPorta[];
  /** O preço de hoje, pela `verificarPreco`. `null` sem preço de hoje ou sem rendimento. */
  hoje: VerificacaoPreco | null;
  /** O preço arredondado, pela mesma função. `null` sem rendimento. */
  sugerido: VerificacaoPreco | null;
  /** (sobra no sugerido − sobra hoje) × vendas; 0 quando hoje ≥ sugerido. */
  aMaisNoMes: Centavos;
}

/**
 * O rascunho no aparelho (spec 040-B, `#d189`): a entrada da calculadora,
 * guardada a cada mudança, para o botão da biblioteca levar para a conta nova.
 * Um só; calcular de novo sobrescreve.
 */
export const CHAVE_DO_RASCUNHO = "rende:conta-da-porta";
export const VALIDADE_DO_RASCUNHO_MS = 30 * 24 * 60 * 60 * 1000;

export interface RascunhoDaPorta extends EntradaDaPorta {
  v: 1;
  salvoEm: number;
}

const centavos = z.number().int().nonnegative();
const esquemaRascunho = z.object({
  v: z.literal(1),
  salvoEm: z.number(),
  receita: z.enum(["cookie-classico", "cookie-recheado"]),
  rendimento: z.number().int().nonnegative(),
  tempoProducaoMinutos: z.number().int().nonnegative(),
  valorHoraTrabalho: centavos,
  precos: z.record(z.string(), centavos),
  precoHoje: centavos.nullable(),
  vendasMes: z.number().int().nonnegative(),
});

/** O rascunho, ou `null` em qualquer dúvida: vazio, quebrado, de outra versão ou velho. */
export function lerRascunho(
  texto: string | null,
  agora: number,
): RascunhoDaPorta | null {
  if (!texto) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  const lido = esquemaRascunho.safeParse(bruto);
  if (!lido.success) return null;
  if (agora - lido.data.salvoEm > VALIDADE_DO_RASCUNHO_MS) return null;
  return lido.data;
}

function fichaDa(receita: ReceitaDaPorta) {
  const ficha = FICHAS_DA_BIBLIOTECA.find((f) => f.id === receita);
  if (!ficha)
    throw new Error(`Receita da biblioteca não encontrada: ${receita}`);
  return ficha;
}

const INSUMOS = new Map(INSUMOS_DA_BIBLIOTECA.map((i) => [i.id, i]));

function insumoDa(id: string) {
  const insumo = INSUMOS.get(id);
  if (!insumo) throw new Error(`Insumo da biblioteca não encontrado: ${id}`);
  return insumo;
}

/** Número que a tela pode ter deixado vazio ou torto vira zero, nunca `NaN`. */
function naoNegativo(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

/** A receita como a biblioteca a traz, com a hora sugerida e sem preço de hoje. */
export function entradaPadrao(receita: ReceitaDaPorta): EntradaDaPorta {
  const ficha = fichaDa(receita);
  return {
    receita,
    rendimento: ficha.rendimento,
    tempoProducaoMinutos: ficha.tempoProducaoMinutos,
    valorHoraTrabalho: CONFIGURACAO_SUGERIDA.operacional.valorHoraTrabalho,
    precos: {},
    precoHoje: null,
    vendasMes: VENDAS_MES_PADRAO,
  };
}

/**
 * Outra receita: rendimento, tempo e preços voltam ao padrão dela; a hora, o
 * preço de hoje e as vendas são da cozinha, e ficam.
 */
export function trocarReceita(
  entrada: EntradaDaPorta,
  receita: ReceitaDaPorta,
): EntradaDaPorta {
  return {
    ...entradaPadrao(receita),
    valorHoraTrabalho: entrada.valorHoraTrabalho,
    precoHoje: entrada.precoHoje,
    vendasMes: entrada.vendasMes,
  };
}

/**
 * A conta do cookie dela. Os itens são montados como `montarBiblioteca` os
 * monta, com o preço dela onde houver, e passam por `derivarFicha` com a
 * configuração sugerida e a hora dela.
 */
export function contaDaPorta(entrada: EntradaDaPorta): ContaDaPorta {
  const ficha = fichaDa(entrada.receita);

  const materiais: MaterialDaPorta[] = [];
  const vistos = new Set<string>();
  const itens = ficha.itens.map((item) => {
    const insumo = insumoDa(item.insumoId);
    const dela = entrada.precos[insumo.id];
    // Preço de pacote vazio vale o médio (spec 040, 3.2).
    const preco = dela && dela > 0 ? dela : insumo.precoCompra;
    if (!vistos.has(insumo.id)) {
      vistos.add(insumo.id);
      materiais.push({
        id: insumo.id,
        nome: insumo.nome,
        embalagem: formatarQuantidade(
          paraBase(insumo.quantidadeCompra, insumo.unidadeCompra),
          unidadeBaseDe(insumo.unidadeCompra),
        ),
        preco,
        padrao: insumo.precoCompra,
      });
    }
    return {
      categoria: insumo.categoria,
      quantidade: item.quantidade,
      custoUnidadeBaseCorrigido: calcularCustoInsumo({
        ...insumo,
        precoCompra: preco,
      }).custoUnidadeBaseCorrigido,
    };
  });

  const rendimento = naoNegativo(entrada.rendimento);
  const derivados = derivarFicha({
    itens,
    componentes: [],
    tempoProducaoMinutos: naoNegativo(entrada.tempoProducaoMinutos),
    rendimento,
    operacional: {
      ...rateioSugerido(),
      valorHoraTrabalho: naoNegativo(entrada.valorHoraTrabalho),
    },
    precificacao: precificacaoSugerida(),
    precoVenda: null,
  });

  const { custoUnitario } = derivados.custo;
  const sugerido =
    rendimento > 0 && derivados.precoArredondado !== null
      ? verificarPreco(
          derivados.precoArredondado,
          custoUnitario,
          derivados.taxas,
        )
      : null;
  const precoHoje = naoNegativo(entrada.precoHoje ?? 0);
  const hoje =
    rendimento > 0 && precoHoje > 0
      ? verificarPreco(precoHoje, custoUnitario, derivados.taxas)
      : null;

  const aMaisNoMes =
    hoje && sugerido
      ? Math.max(0, sugerido.lucroUnitario - hoje.lucroUnitario) *
        Math.round(naoNegativo(entrada.vendasMes))
      : 0;

  return {
    derivados,
    segmentos: composicaoDoLote(derivados.custo),
    materiais,
    hoje,
    sugerido,
    aMaisNoMes,
  };
}

/**
 * O cookie dela no painel do cadastro (spec 155, `#d364`), na forma que a
 * `ContaAberta` lê. Sem preço de hoje, o praticado é o sugerido. `null` sem
 * rendimento ou sem sugerido: a porta volta ao `EXEMPLO`.
 */
export function exemploDoRascunho(
  rascunho: RascunhoDaPorta,
): ExemploDePagina | null {
  const { derivados, sugerido } = contaDaPorta(rascunho);
  if (!sugerido || derivados.precoArredondado === null) return null;
  const precoHoje = naoNegativo(rascunho.precoHoje ?? 0);
  return {
    nome: fichaDa(rascunho.receita).nome,
    rende: rascunho.rendimento,
    custo: derivados.custo,
    parametros: precificacaoSugerida(),
    precoPraticado: precoHoje > 0 ? precoHoje : derivados.precoArredondado,
  };
}

/**
 * A conta sem receita (spec 176): as cinco parcelas em reais, na unidade em que
 * ela vende, para quem já sabe ou estima o custo de cada uma. A unidade é só
 * palavra: trocar "cento" não converte nada.
 */
export type UnidadeDeVenda = "unidade" | "cento" | "quilo" | "pote";

/** As cinco parcelas, com os nomes do custo da ficha. */
export type ParcelasDoCusto = Pick<
  CustoFichaCalculado,
  | "custoInsumos"
  | "custoEmbalagem"
  | "custoMaoDeObra"
  | "custoEnergiaGas"
  | "custoIndireto"
>;

export interface EntradaDasParcelas extends ParcelasDoCusto {
  margemDesejada: Percentual;
  /** Maquininha, aplicativo, pagamento online, somados por ela. */
  taxas: Percentual;
  precoHoje: Centavos | null;
}

export interface ContaDasParcelas {
  /** O custo de uma unidade de venda: a soma das cinco. */
  custo: Centavos;
  segmentos: Segmento[];
  preco: ResultadoPreco;
  /** O preço arredondado, pela `verificarPreco`. `null` sem preço possível. */
  sugerido: VerificacaoPreco | null;
  /** O preço de hoje, pela mesma função. `null` sem preço de hoje. */
  hoje: VerificacaoPreco | null;
}

/** Uma parcela do lote do exemplo, na unidade em que ele se vende. */
function porUnidade({ custo, rende }: ExemploDePagina): ParcelasDoCusto {
  const por = (centavos: Centavos) => Math.round(centavos / rende);
  return {
    custoInsumos: por(custo.custoInsumos),
    custoEmbalagem: por(custo.custoEmbalagem),
    custoMaoDeObra: por(custo.custoMaoDeObra),
    custoEnergiaGas: por(custo.custoEnergiaGas),
    custoIndireto: por(custo.custoIndireto),
  };
}

const doExemplo = <R extends string>(
  rotulo: R,
  unidade: UnidadeDeVenda,
  exemplo: ExemploDePagina,
) => ({
  valor: rotulo,
  rotulo,
  unidade,
  parcelas: porUnidade(exemplo),
  taxas: somaTaxas(exemplo.parametros),
});

/** Os quatro doces da tabela, por unidade de venda, com as taxas do balcão. */
export const EXEMPLOS_DAS_PARCELAS = [
  doExemplo("Cookie", "unidade", EXEMPLO),
  doExemplo("Brigadeiro", "cento", EXEMPLO_BRIGADEIRO),
  doExemplo("Bolo", "quilo", boloDe(2)),
  doExemplo("Bolo de pote", "pote", EXEMPLO_BOLO_DE_POTE),
] as const;

export type DoceDasParcelas = (typeof EXEMPLOS_DAS_PARCELAS)[number]["valor"];

/**
 * Um dos exemplos, com 40% e as taxas dele: onde a calculadora começa. Sem
 * doce, o cookie; nas páginas de cada doce, o daquela página (spec 178).
 */
export function entradaDasParcelas(
  doce: DoceDasParcelas = "Cookie",
): EntradaDasParcelas {
  const exemplo =
    EXEMPLOS_DAS_PARCELAS.find((e) => e.valor === doce) ??
    EXEMPLOS_DAS_PARCELAS[0];
  return {
    ...exemplo.parcelas,
    margemDesejada: EXEMPLO.parametros.margemDesejada,
    taxas: exemplo.taxas,
    precoHoje: null,
  };
}

/**
 * Custo, preço e sobra a partir das cinco parcelas. Só compõe o que o app já
 * faz: `calcularPrecoSugerido` com o método e o arredondamento dos exemplos,
 * `verificarPreco` no sugerido e no de hoje. Número torto vira zero.
 */
export function contaDasParcelas(
  entrada: EntradaDasParcelas,
): ContaDasParcelas {
  const parcelas: ParcelasDoCusto = {
    custoInsumos: naoNegativo(entrada.custoInsumos),
    custoEmbalagem: naoNegativo(entrada.custoEmbalagem),
    custoMaoDeObra: naoNegativo(entrada.custoMaoDeObra),
    custoEnergiaGas: naoNegativo(entrada.custoEnergiaGas),
    custoIndireto: naoNegativo(entrada.custoIndireto),
  };
  const custo = Object.values(parcelas).reduce((a, b) => a + b, 0);
  const parametros = {
    ...EXEMPLO.parametros,
    margemDesejada: naoNegativo(entrada.margemDesejada),
    taxaCartaoConsiderada: naoNegativo(entrada.taxas),
    outrasTaxas: 0,
  };
  const taxas = somaTaxas(parametros);
  const preco = calcularPrecoSugerido(custo, parametros);
  const precoHoje = naoNegativo(entrada.precoHoje ?? 0);

  return {
    custo,
    segmentos: composicaoDoLote({
      ...parcelas,
      custoComponentes: 0,
      custoEscolhas: 0,
      custoTotalLote: custo,
      custoUnitario: custo,
    }),
    preco,
    sugerido: preco.ok
      ? verificarPreco(preco.precoArredondado, custo, taxas)
      : null,
    hoje: precoHoje > 0 ? verificarPreco(precoHoje, custo, taxas) : null,
  };
}

/**
 * A conta no endereço (spec 180, `DECISOES.md#d398`): `?conta=` com a versão,
 * as cinco parcelas em centavos, margem, taxas, o preço de hoje (`0` sem ele)
 * e a unidade, separados por `-`. Nada guardado no aparelho nem no servidor.
 */
const VERSAO_DA_CONTA = "1";
const ORDEM_DAS_PARCELAS = [
  "custoInsumos",
  "custoEmbalagem",
  "custoMaoDeObra",
  "custoEnergiaGas",
  "custoIndireto",
] as const satisfies readonly (keyof ParcelasDoCusto)[];
const UNIDADES_DE_VENDA: readonly UnidadeDeVenda[] = [
  "unidade",
  "cento",
  "quilo",
  "pote",
];
/** R$ 100.000,00: acima disso o endereço foi mexido à mão. */
const TETO_DA_PARCELA = 10_000_000;

export function enderecoDaConta(
  entrada: EntradaDasParcelas,
  unidade: UnidadeDeVenda,
): string {
  const inteiro = (n: number) => String(Math.round(naoNegativo(n)));
  return `?conta=${[
    VERSAO_DA_CONTA,
    ...ORDEM_DAS_PARCELAS.map((chave) => inteiro(entrada[chave])),
    String(naoNegativo(entrada.margemDesejada)),
    String(naoNegativo(entrada.taxas)),
    inteiro(entrada.precoHoje ?? 0),
    unidade,
  ].join("-")}`;
}

/** `null` para qualquer coisa que `enderecoDaConta` não escreveria. Nunca lança. */
export function lerContaDoEndereco(
  texto: string,
): { entrada: EntradaDasParcelas; unidade: UnidadeDeVenda } | null {
  const conta = new URLSearchParams(texto).get("conta");
  const campos = conta?.split("-") ?? [];
  if (campos.length !== 10 || campos[0] !== VERSAO_DA_CONTA) return null;

  const centavos = (t = "") =>
    /^\d{1,9}$/.test(t) && Number(t) <= TETO_DA_PARCELA ? Number(t) : null;
  const percentual = (t = "") =>
    /^\d{1,3}(\.\d{1,4})?$/.test(t) && Number(t) <= 100 ? Number(t) : null;

  const parcelas = ORDEM_DAS_PARCELAS.map((_, i) => centavos(campos[i + 1]));
  const margem = percentual(campos[6]);
  const taxas = percentual(campos[7]);
  const hoje = centavos(campos[8]);
  const unidade = UNIDADES_DE_VENDA.find((u) => u === campos[9]);
  if (
    parcelas.some((p) => p === null) ||
    margem === null ||
    taxas === null ||
    hoje === null ||
    !unidade
  )
    return null;

  return {
    entrada: {
      ...(Object.fromEntries(
        ORDEM_DAS_PARCELAS.map((chave, i) => [chave, parcelas[i]]),
      ) as ParcelasDoCusto),
      margemDesejada: margem,
      taxas,
      precoHoje: hoje > 0 ? hoje : null,
    },
    unidade,
  };
}

const MEU: Record<UnidadeDeVenda, string> = {
  unidade: "da minha unidade",
  cento: "do meu cento",
  quilo: "do meu quilo",
  pote: "do meu pote",
};

/** "40%", "4,5%": como ela digitou. */
const porCento = (n: number) => `${naoNegativo(n).toLocaleString("pt-BR")}%`;

/** A mensagem que vai com o link (spec 180): a conta dela em três ou quatro linhas. */
export function textoDaConta(
  conta: ContaDasParcelas,
  entrada: EntradaDasParcelas,
  unidade: UnidadeDeVenda,
): string {
  const r = (n: number) => formatarMoeda(Math.round(naoNegativo(n)));
  const linhas = [
    `O preço ${MEU[unidade]}, pela conta do Rende:`,
    `custa ${r(conta.custo)} (ingredientes ${r(entrada.custoInsumos)}, embalagem ${r(entrada.custoEmbalagem)}, minha hora ${r(entrada.custoMaoDeObra)}, gás ${r(entrada.custoEnergiaGas)}, fixas ${r(entrada.custoIndireto)}).`,
    conta.preco.ok && conta.sugerido
      ? `Cobrar ${r(conta.preco.precoArredondado)}, com ${porCento(entrada.margemDesejada)} de margem e ${porCento(entrada.taxas)} de taxas: sobram ${r(conta.sugerido.lucroUnitario)} pra mim.`
      : "Margem e taxas passam de 100%: falta ajustar.",
  ];
  if (conta.hoje) {
    const hoje = r(entrada.precoHoje ?? 0);
    const { lucroUnitario } = conta.hoje;
    linhas.push(
      lucroUnitario < 0
        ? `Hoje cobro ${hoje} e perco ${r(-lucroUnitario)} por venda.`
        : `Hoje cobro ${hoje} e sobram ${r(lucroUnitario)}.`,
    );
  }
  return linhas.join("\n");
}
