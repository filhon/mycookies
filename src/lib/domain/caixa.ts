import type {
  CategoriaTransacao,
  Centavos,
  DataISO,
  FormaPagamento,
  ResumoDia,
  TipoTransacao,
} from "@/lib/types";
import { taxaCobrada } from "./custosOperacionais";
import { diaDeISO } from "./datas";

/**
 * O motor do agregado mensal.
 *
 * Duas funções fazem a mesma conta por caminhos diferentes de propósito:
 * `deltaDaTransacao` diz o que muda quando um lançamento entra ou sai, e
 * `agregarTransacoes` reconstrói o mês inteiro do zero. Agregado mantido por
 * incremento torce em silêncio — um delta perdido não dá erro, não aparece em
 * log e só é notado quando o lucro do mês parece estranho. As duas existem para
 * que o teste possa exigir que concordem, e é o teste que percebe a torção
 * antes da usuária (`DECISOES.md#d10` e `#d23`).
 */

/** O que o agregado precisa saber de um lançamento. Nada além disso. */
export interface TransacaoAgregavel {
  tipo: TipoTransacao;
  categoria: CategoriaTransacao;
  /** SEMPRE positivo. O sinal mora em `tipo`. */
  valor: Centavos;
  dataISO: DataISO;
  /**
   * O que a maquininha ficou desta entrada, congelado no lançamento.
   * Zero em toda saída e em toda entrada sem forma de pagamento.
   */
  custoTaxa: Centavos;
}

/** `+1` aplica a transação no agregado, `−1` desfaz a contribuição dela. */
export type Sinal = 1 | -1;

/** A parte do `ResumoMensal` que nasce de transação. O resto é do pedido. */
export interface ParcelasDoAgregado {
  entradas: Centavos;
  saidas: Centavos;
  custoTaxasPagamento: Centavos;
  lucro: Centavos;
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>;
  porDia: Record<string, ResumoDia>;
}

export const PARCELAS_ZERADAS: ParcelasDoAgregado = {
  entradas: 0,
  saidas: 0,
  custoTaxasPagamento: 0,
  lucro: 0,
  porCategoriaSaida: {},
  porDia: {},
};

/**
 * O que a maquininha cobra de uma entrada.
 *
 * Só entrada tem taxa, e só quando a venda aponta para uma forma de pagamento.
 * A taxa é derivada da entrada e não vira uma saída própria: ela merece linha
 * no painel em vez de se dissolver entre aluguel e farinha, e uma transação
 * automática poluiria a lista com uma linha que a usuária não lançou
 * (`DECISOES.md#d24`).
 */
export function taxaDaEntrada(
  transacao: {
    tipo: TipoTransacao;
    valor: Centavos;
    formaPagamentoId?: string;
  },
  formas: FormaPagamento[],
): Centavos {
  if (transacao.tipo !== "ENTRADA" || !transacao.formaPagamentoId) return 0;

  const forma = formas.find((item) => item.id === transacao.formaPagamentoId);
  if (!forma) return 0;

  return taxaCobrada(transacao.valor, forma);
}

/**
 * O que somar no agregado por causa de um lançamento.
 *
 * Editar é reverter mais aplicar: `delta(anterior, −1)` seguido de
 * `delta(nova, +1)`. Arquivar é só a primeira metade. E se a data mudou de mês,
 * as duas metades caem em documentos diferentes.
 */
export function deltaDaTransacao(
  transacao: TransacaoAgregavel,
  sinal: Sinal,
): ParcelasDoAgregado {
  const ehEntrada = transacao.tipo === "ENTRADA";
  const valor = sinal * transacao.valor;

  const entradas = ehEntrada ? valor : 0;
  const saidas = ehEntrada ? 0 : valor;
  const custoTaxasPagamento = ehEntrada ? sinal * transacao.custoTaxa : 0;

  return {
    entradas,
    saidas,
    custoTaxasPagamento,
    lucro: entradas - saidas - custoTaxasPagamento,
    porCategoriaSaida: ehEntrada ? {} : { [transacao.categoria]: valor },
    porDia: {
      // `pedidos` é do Módulo 3 e nunca é tocado por transação.
      [diaDeISO(transacao.dataISO)]: { entradas, saidas, pedidos: 0 },
    },
  };
}

/**
 * O mês inteiro somado do zero.
 *
 * Escrita sem usar `deltaDaTransacao`, e é isso que a torna útil: uma segunda
 * implementação da mesma verdade. É a rede de segurança de "Recalcular o mês" e
 * o oráculo do teste. Se as duas concordassem por construção, o teste não
 * provaria nada.
 */
export function agregarTransacoes(
  transacoes: TransacaoAgregavel[],
): ParcelasDoAgregado {
  let entradas = 0;
  let saidas = 0;
  let custoTaxasPagamento = 0;
  const porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>> = {};
  const porDia: Record<string, ResumoDia> = {};

  for (const transacao of transacoes) {
    const dia = diaDeISO(transacao.dataISO);
    const linha = (porDia[dia] ??= { entradas: 0, saidas: 0, pedidos: 0 });

    if (transacao.tipo === "ENTRADA") {
      entradas += transacao.valor;
      custoTaxasPagamento += transacao.custoTaxa;
      linha.entradas += transacao.valor;
    } else {
      saidas += transacao.valor;
      linha.saidas += transacao.valor;
      porCategoriaSaida[transacao.categoria] =
        (porCategoriaSaida[transacao.categoria] ?? 0) + transacao.valor;
    }
  }

  return {
    entradas,
    saidas,
    custoTaxasPagamento,
    lucro: entradas - saidas - custoTaxasPagamento,
    porCategoriaSaida,
    porDia,
  };
}

/**
 * Aplica um delta sobre parcelas já somadas.
 *
 * Chave que chega a zero é removida, e não guardada zerada: uma categoria sem
 * gasto nenhum não é uma linha de R$ 0,00 no painel, é uma linha que não
 * existe. É também o que faz o resultado de uma sequência de deltas ser
 * comparável, campo a campo, com o de uma reconstrução.
 */
export function somarParcelas(
  base: ParcelasDoAgregado,
  delta: ParcelasDoAgregado,
): ParcelasDoAgregado {
  const porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>> = {
    ...base.porCategoriaSaida,
  };
  for (const [categoria, valor] of Object.entries(delta.porCategoriaSaida)) {
    const chave = categoria as CategoriaTransacao;
    const total = (porCategoriaSaida[chave] ?? 0) + (valor ?? 0);
    if (total === 0) delete porCategoriaSaida[chave];
    else porCategoriaSaida[chave] = total;
  }

  const porDia: Record<string, ResumoDia> = { ...base.porDia };
  for (const [dia, linha] of Object.entries(delta.porDia)) {
    const anterior = porDia[dia] ?? { entradas: 0, saidas: 0, pedidos: 0 };
    const total: ResumoDia = {
      entradas: anterior.entradas + linha.entradas,
      saidas: anterior.saidas + linha.saidas,
      pedidos: anterior.pedidos + linha.pedidos,
    };
    if (total.entradas === 0 && total.saidas === 0 && total.pedidos === 0) {
      delete porDia[dia];
    } else {
      porDia[dia] = total;
    }
  }

  return {
    entradas: base.entradas + delta.entradas,
    saidas: base.saidas + delta.saidas,
    custoTaxasPagamento: base.custoTaxasPagamento + delta.custoTaxasPagamento,
    lucro: base.lucro + delta.lucro,
    porCategoriaSaida,
    porDia,
  };
}

/**
 * Lê as parcelas de um documento de agregado que pode não existir, ou existir
 * pela metade.
 *
 * Mês sem lançamento nenhum não tem documento, e o painel precisa saber a
 * diferença entre "não há" e "deu zero" — a tela decide o que mostrar a partir
 * disso, e não a partir de um zero que ela mesma inventou.
 */
export function parcelasDoResumo(
  resumo: Partial<ParcelasDoAgregado> | null | undefined,
): ParcelasDoAgregado {
  return {
    entradas: resumo?.entradas ?? 0,
    saidas: resumo?.saidas ?? 0,
    custoTaxasPagamento: resumo?.custoTaxasPagamento ?? 0,
    lucro: resumo?.lucro ?? 0,
    porCategoriaSaida: resumo?.porCategoriaSaida ?? {},
    porDia: resumo?.porDia ?? {},
  };
}

/** As saídas do mês em ordem de tamanho: para onde o dinheiro foi de fato. */
export function saidasOrdenadas(
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>,
): { categoria: CategoriaTransacao; valor: Centavos }[] {
  return Object.entries(porCategoriaSaida)
    .map(([categoria, valor]) => ({
      categoria: categoria as CategoriaTransacao,
      valor: valor ?? 0,
    }))
    .filter((linha) => linha.valor !== 0)
    .sort((a, b) => b.valor - a.valor);
}

export const ROTULO_CATEGORIA_TRANSACAO: Record<CategoriaTransacao, string> = {
  VENDA: "Venda",
  COMPRA_INSUMO: "Compra de insumo",
  EMBALAGEM: "Embalagem",
  DESPESA_FIXA: "Despesa fixa",
  EQUIPAMENTO: "Equipamento",
  MARKETING: "Divulgação",
  TAXA_PAGAMENTO: "Custo de maquininha",
  IMPOSTO: "Imposto",
  PRO_LABORE: "Retirada sua",
  OUTRO: "Outro",
};

/** O que entra dinheiro. Curto de propósito: quase tudo é venda. */
export const CATEGORIAS_ENTRADA: CategoriaTransacao[] = ["VENDA", "OUTRO"];

export const CATEGORIAS_SAIDA: CategoriaTransacao[] = [
  "COMPRA_INSUMO",
  "EMBALAGEM",
  "DESPESA_FIXA",
  "EQUIPAMENTO",
  "MARKETING",
  "TAXA_PAGAMENTO",
  "IMPOSTO",
  "PRO_LABORE",
  "OUTRO",
];

export function categoriasDoTipo(tipo: TipoTransacao): CategoriaTransacao[] {
  return tipo === "ENTRADA" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
}

/**
 * A dica que evita o erro mais caro desta tela: lançar a taxa duas vezes.
 *
 * A taxa de cada venda já sai da própria venda. `TAXA_PAGAMENTO` existe para o
 * que é despesa avulsa de verdade — aluguel da maquininha, mensalidade de
 * gateway —, e sem essa frase no lugar do campo ela vira uma segunda cobrança.
 */
export const DICA_CATEGORIA: Partial<Record<CategoriaTransacao, string>> = {
  TAXA_PAGAMENTO:
    "Só o que você paga à parte, como aluguel da maquininha ou mensalidade. A taxa de cada venda o sistema já desconta sozinho.",
  PRO_LABORE: "O que você tira do negócio para você.",
};
