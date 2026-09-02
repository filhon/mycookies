import type {
  CategoriaTransacao,
  Centavos,
  DataISO,
  FormaPagamento,
  ResumoDia,
  ResumoProduto,
  TipoTransacao,
} from "@/lib/types";
import { taxaCobrada } from "./custosOperacionais";
import { diaDeISO } from "./datas";

/**
 * O motor do agregado mensal, nas suas duas metades.
 *
 * Cada metade tem duas funções que fazem a mesma conta por caminhos diferentes,
 * de propósito: o `delta` diz o que muda quando um documento entra ou sai, e o
 * `agregar` reconstrói o mês inteiro do zero. Agregado mantido por incremento
 * torce em silêncio — um delta perdido não dá erro, não aparece em log e só é
 * notado quando o lucro do mês parece estranho. Os pares existem para que o
 * teste possa exigir que concordem, e é o teste que percebe a torção antes da
 * usuária (`DECISOES.md#d10` e `#d23`).
 *
 * A metade da transação (`entradas`, `saidas`, `lucro`, taxa) e a do pedido
 * (`qtdPedidos`, `receitaPedidos`, `produtos`) escrevem no mesmo documento e
 * **não se sobrepõem em campo nenhum**: um pedido pago produz os dois deltas, e
 * eles são somados antes de virar uma escrita só.
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

/** Uma linha do pedido, como o agregado a consome. */
export interface ItemAgregavel {
  fichaTecnicaId: string;
  nomeSnapshot: string;
  quantidade: number;
  /** O que a cliente pagou por esta linha, já congelado no pedido. */
  subtotal: Centavos;
  /** O que a linha custou para produzir, pelo custo congelado. */
  custo: Centavos;
}

/**
 * O que o agregado precisa saber de um pedido **pago**.
 *
 * `pagoEmISO` é o dia do pagamento, e nunca o da entrega: o painel é regime de
 * caixa, e um pedido entregue em 30/09 e pago em 02/10 conta em outubro
 * (`DECISOES.md#d36`).
 */
export interface PedidoAgregavel {
  pagoEmISO: DataISO;
  total: Centavos;
  custoTotalEstimado: Centavos;
  itens: ItemAgregavel[];
}

/** `+1` aplica a contribuição no agregado, `−1` a desfaz. */
export type Sinal = 1 | -1;

/** As parcelas do `ResumoMensal` que se mantêm por incremento, as duas metades. */
export interface ParcelasDoAgregado {
  // ---- Metade da transação ----
  entradas: Centavos;
  saidas: Centavos;
  custoTaxasPagamento: Centavos;
  lucro: Centavos;
  porCategoriaSaida: Partial<Record<CategoriaTransacao, Centavos>>;

  // ---- Metade do pedido ----
  qtdPedidos: number;
  qtdItensVendidos: number;
  receitaPedidos: Centavos;
  custoDoVendido: Centavos;
  produtos: Record<string, ResumoProduto>;

  /** As duas metades escrevem aqui: entradas/saídas de um lado, pedidos do outro. */
  porDia: Record<string, ResumoDia>;
}

export const PARCELAS_ZERADAS: ParcelasDoAgregado = {
  entradas: 0,
  saidas: 0,
  custoTaxasPagamento: 0,
  lucro: 0,
  porCategoriaSaida: {},
  qtdPedidos: 0,
  qtdItensVendidos: 0,
  receitaPedidos: 0,
  custoDoVendido: 0,
  produtos: {},
  porDia: {},
};

/** A metade do pedido, zerada: é o que um delta de transação traz dela. */
function semPedido() {
  return {
    qtdPedidos: 0,
    qtdItensVendidos: 0,
    receitaPedidos: 0,
    custoDoVendido: 0,
    produtos: {} as Record<string, ResumoProduto>,
  };
}

/** A metade da transação, zerada: um pedido não move dinheiro por si só. */
function semTransacao() {
  return {
    entradas: 0,
    saidas: 0,
    custoTaxasPagamento: 0,
    lucro: 0,
    porCategoriaSaida: {} as Partial<Record<CategoriaTransacao, Centavos>>,
  };
}

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
    ...semPedido(),
    entradas,
    saidas,
    custoTaxasPagamento,
    lucro: entradas - saidas - custoTaxasPagamento,
    porCategoriaSaida: ehEntrada ? {} : { [transacao.categoria]: valor },
    porDia: {
      // `pedidos` é da metade do pedido e nunca é tocado por transação — nem
      // quando a transação nasceu de um pedido pago: lá são dois deltas.
      [diaDeISO(transacao.dataISO)]: { entradas, saidas, pedidos: 0 },
    },
  };
}

/**
 * O que somar no agregado por causa de um pedido pago.
 *
 * Não move um centavo de `entradas`, `saidas` nem `lucro`: quem move dinheiro é
 * a transação que o pagamento cria. Marcar um pedido como pago produz os dois
 * deltas, e eles são somados antes de virar uma escrita só do agregado — senão
 * o espelho da meta seria reescrito duas vezes, a segunda com o total de antes.
 *
 * O lucro por produto **não desconta desconto, entrega nem maquininha**: as três
 * são do pedido inteiro e não têm como ser rateadas por item sem inventar um
 * critério. Quem desconta tudo é `lucro`, que é do mês.
 */
export function deltaDoPedido(
  pedido: PedidoAgregavel,
  sinal: Sinal,
): ParcelasDoAgregado {
  const produtos: Record<string, ResumoProduto> = {};
  let quantidadeItens = 0;

  for (const item of pedido.itens) {
    quantidadeItens += item.quantidade;

    // A mesma ficha pode aparecer em duas linhas do pedido: acumula, não
    // sobrescreve.
    const linha = (produtos[item.fichaTecnicaId] ??= {
      nome: item.nomeSnapshot,
      quantidade: 0,
      receita: 0,
      lucro: 0,
    });
    linha.quantidade += sinal * item.quantidade;
    linha.receita += sinal * item.subtotal;
    linha.lucro += sinal * (item.subtotal - item.custo);
  }

  return {
    ...semTransacao(),
    qtdPedidos: sinal,
    qtdItensVendidos: sinal * quantidadeItens,
    receitaPedidos: sinal * pedido.total,
    custoDoVendido: sinal * pedido.custoTotalEstimado,
    produtos,
    porDia: {
      [diaDeISO(pedido.pagoEmISO)]: { entradas: 0, saidas: 0, pedidos: sinal },
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
    ...semPedido(),
    entradas,
    saidas,
    custoTaxasPagamento,
    lucro: entradas - saidas - custoTaxasPagamento,
    porCategoriaSaida,
    porDia,
  };
}

/**
 * A metade do pedido, somada do zero.
 *
 * Segunda implementação da mesma verdade de `deltaDoPedido`, escrita sem usar
 * aquela função, pelo mesmo motivo de `agregarTransacoes`: se as duas
 * concordassem por construção, o teste não provaria nada.
 */
export function agregarPedidos(pedidos: PedidoAgregavel[]): ParcelasDoAgregado {
  let qtdPedidos = 0;
  let qtdItensVendidos = 0;
  let receitaPedidos = 0;
  let custoDoVendido = 0;
  const produtos: Record<string, ResumoProduto> = {};
  const porDia: Record<string, ResumoDia> = {};

  for (const pedido of pedidos) {
    qtdPedidos += 1;
    receitaPedidos += pedido.total;
    custoDoVendido += pedido.custoTotalEstimado;

    const dia = diaDeISO(pedido.pagoEmISO);
    const linhaDoDia = (porDia[dia] ??= { entradas: 0, saidas: 0, pedidos: 0 });
    linhaDoDia.pedidos += 1;

    for (const item of pedido.itens) {
      qtdItensVendidos += item.quantidade;

      const anterior = produtos[item.fichaTecnicaId];
      produtos[item.fichaTecnicaId] = {
        // O nome mais recente vence: `nomeSnapshot` é de quando o item entrou
        // no pedido, e o ranking do mês fala do que ela vende hoje.
        nome: item.nomeSnapshot,
        quantidade: (anterior?.quantidade ?? 0) + item.quantidade,
        receita: (anterior?.receita ?? 0) + item.subtotal,
        lucro: (anterior?.lucro ?? 0) + (item.subtotal - item.custo),
      };
    }
  }

  return {
    ...semTransacao(),
    qtdPedidos,
    qtdItensVendidos,
    receitaPedidos,
    custoDoVendido,
    produtos,
    porDia,
  };
}

/**
 * O mês inteiro, as duas metades. É o corpo de "Recalcular o mês".
 *
 * Depois desta função, recalcular **não precisa mais ler o agregado antes de
 * reescrevê-lo**: a leitura só existia para preservar `porDia[].pedidos`, que
 * era do módulo que ainda não existia (`DECISOES.md#d23`, segunda
 * consequência). Uma consulta a mais, uma leitura a menos.
 */
export function agregarMes(
  transacoes: TransacaoAgregavel[],
  pedidos: PedidoAgregavel[],
): ParcelasDoAgregado {
  return somarParcelas(agregarTransacoes(transacoes), agregarPedidos(pedidos));
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

  // Mesma regra das categorias: o produto cuja contribuição foi revertida some
  // do ranking em vez de ficar como uma linha de zero unidades.
  const produtos: Record<string, ResumoProduto> = { ...base.produtos };
  for (const [fichaId, linha] of Object.entries(delta.produtos)) {
    const anterior = produtos[fichaId];
    const total: ResumoProduto = {
      nome: linha.nome || (anterior?.nome ?? ""),
      quantidade: (anterior?.quantidade ?? 0) + linha.quantidade,
      receita: (anterior?.receita ?? 0) + linha.receita,
      lucro: (anterior?.lucro ?? 0) + linha.lucro,
    };
    if (total.quantidade === 0 && total.receita === 0 && total.lucro === 0) {
      delete produtos[fichaId];
    } else {
      produtos[fichaId] = total;
    }
  }

  return {
    entradas: base.entradas + delta.entradas,
    saidas: base.saidas + delta.saidas,
    custoTaxasPagamento: base.custoTaxasPagamento + delta.custoTaxasPagamento,
    lucro: base.lucro + delta.lucro,
    porCategoriaSaida,
    qtdPedidos: base.qtdPedidos + delta.qtdPedidos,
    qtdItensVendidos: base.qtdItensVendidos + delta.qtdItensVendidos,
    receitaPedidos: base.receitaPedidos + delta.receitaPedidos,
    custoDoVendido: base.custoDoVendido + delta.custoDoVendido,
    produtos,
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
    qtdPedidos: resumo?.qtdPedidos ?? 0,
    qtdItensVendidos: resumo?.qtdItensVendidos ?? 0,
    receitaPedidos: resumo?.receitaPedidos ?? 0,
    custoDoVendido: resumo?.custoDoVendido ?? 0,
    produtos: resumo?.produtos ?? {},
    porDia: resumo?.porDia ?? {},
  };
}

/**
 * O valor médio de um pedido pago no mês.
 *
 * Razão, e razão não se incrementa: ela é gravada no mesmo ponto em que as
 * parcelas mudam e **refeita na leitura** a partir de `receitaPedidos` e
 * `qtdPedidos`, que são exatos porque são incrementos. Quem desenha a tela usa
 * esta versão, e não a gravada — a regra de `DECISOES.md#d30`.
 */
export function ticketMedioDe(
  receitaPedidos: Centavos,
  qtdPedidos: number,
): Centavos {
  return qtdPedidos > 0 ? Math.round(receitaPedidos / qtdPedidos) : 0;
}

/**
 * O ranking de produtos do mês, do que mais faturou para o que menos faturou.
 *
 * Descarta a linha zerada pelo mesmo motivo de `saidasOrdenadas`: um produto
 * cuja contribuição foi revertida sobra no documento como três zeros, porque
 * `increment` não apaga chave. "Recalcular o mês" limpa; a tela não precisa
 * esperar por isso.
 */
export function produtosOrdenados(
  produtos: Record<string, ResumoProduto>,
): { fichaId: string; produto: ResumoProduto }[] {
  return Object.entries(produtos)
    .map(([fichaId, produto]) => ({ fichaId, produto }))
    .filter(({ produto }) => produto.quantidade > 0 || produto.receita !== 0)
    .sort((a, b) => b.produto.receita - a.produto.receita);
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
