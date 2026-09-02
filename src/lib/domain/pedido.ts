import type {
  Centavos,
  DataISO,
  FormaPagamento,
  StatusPedido,
} from "@/lib/types";
import { taxaCobrada } from "./custosOperacionais";
import { novoId } from "@/lib/utils/id";

/**
 * O motor do pedido: os totais, o código, e para onde um pedido pode ir.
 *
 * `derivarPedido` existe pelo mesmo motivo de `derivarFicha`
 * (`DECISOES.md#d19`): o editor chama para desenhar o rodapé e a mutação chama
 * para gravar. Dois caminhos somando um pedido seriam dois caminhos para o
 * total divergir do que a Maynara mostrou para a cliente.
 *
 * Nada aqui toca o caixa nem o agregado mensal: um pedido pode ser criado,
 * confirmado e entregue sem que um centavo se mova no painel financeiro.
 */

type TaxasDaForma = Pick<FormaPagamento, "taxaPercentual" | "taxaFixa">;

/** O que uma linha do pedido precisa ter para virar dinheiro. */
export interface ItemParaPedido {
  quantidade: number;
  /** Preço congelado quando o item entrou no pedido (`DECISOES.md#d08`). */
  precoUnitario: Centavos;
  /** Custo congelado no mesmo instante, e pelo mesmo motivo. */
  custoUnitarioSnapshot: Centavos;
}

export interface EntradaPedido {
  itens: ItemParaPedido[];
  desconto: Centavos;
  /** Entra no total e não entra no custo: é dinheiro que ela recebe. */
  taxaEntrega: Centavos;
  /** A forma escolhida, ou nada enquanto ela não escolheu. */
  forma?: TaxasDaForma | null;
}

export interface LinhaDoPedido {
  subtotal: Centavos;
  custo: Centavos;
}

export interface DerivadosPedido {
  /** Uma entrada por item, na mesma ordem em que a tela as desenha. */
  linhas: LinhaDoPedido[];
  subtotal: Centavos;
  /** O desconto que de fato vale, já limitado ao subtotal. */
  desconto: Centavos;
  /** O que ela digitou, antes da guarda. */
  descontoPedido: Centavos;
  /** O desconto pedido não cabia no subtotal, e a tela precisa dizer isso. */
  descontoLimitado: boolean;
  taxaEntrega: Centavos;
  total: Centavos;
  custoTotalEstimado: Centavos;
  custoTaxaPagamento: Centavos;
  lucroEstimado: Centavos;
  /** Σ das quantidades. É quantos doces saem deste pedido. */
  quantidadeItens: number;
}

/** Quantidade negativa é dedo errado, não desconto: vale zero até ela corrigir. */
function quantidadeUtil(item: ItemParaPedido): number {
  return item.quantidade > 0 ? item.quantidade : 0;
}

export function subtotalDoItem(item: ItemParaPedido): Centavos {
  return Math.round(item.precoUnitario * quantidadeUtil(item));
}

export function custoDoItem(item: ItemParaPedido): Centavos {
  return Math.round(item.custoUnitarioSnapshot * quantidadeUtil(item));
}

/**
 * Todos os números de um pedido, de uma vez só.
 *
 * A taxa de entrega entra no total e **não** entra no custo: descontá-la como
 * custo exigiria um campo de custo de entrega que não existe, o que seria
 * inventar dado. A consequência é que `lucroEstimado` carrega a taxa dentro, e
 * por isso a tela mostra a entrega em linha própria.
 *
 * A taxa da maquininha incide sobre o total, entrega inclusa, porque é sobre o
 * total que a maquininha cobra.
 */
export function derivarPedido(entrada: EntradaPedido): DerivadosPedido {
  const linhas: LinhaDoPedido[] = entrada.itens.map((item) => ({
    subtotal: subtotalDoItem(item),
    custo: custoDoItem(item),
  }));

  const subtotal = linhas.reduce((soma, linha) => soma + linha.subtotal, 0);
  const custoTotalEstimado = linhas.reduce(
    (soma, linha) => soma + linha.custo,
    0,
  );

  const descontoPedido = Math.max(0, Math.round(entrada.desconto || 0));
  // Guarda: um desconto maior que o subtotal viraria total negativo, e total
  // negativo não é venda, é erro de digitação com cara de promoção.
  const desconto = Math.min(descontoPedido, subtotal);
  const taxaEntrega = Math.max(0, Math.round(entrada.taxaEntrega || 0));

  const total = subtotal - desconto + taxaEntrega;
  const custoTaxaPagamento = entrada.forma
    ? taxaCobrada(total, entrada.forma)
    : 0;

  return {
    linhas,
    subtotal,
    desconto,
    descontoPedido,
    descontoLimitado: desconto < descontoPedido,
    taxaEntrega,
    total,
    custoTotalEstimado,
    custoTaxaPagamento,
    lucroEstimado: total - custoTotalEstimado - custoTaxaPagamento,
    quantidadeItens: entrada.itens.reduce(
      (soma, item) => soma + quantidadeUtil(item),
      0,
    ),
  };
}

/** Quantos caracteres do id entram no código. Três bastam para ela ler em voz alta. */
const CARACTERES_DO_CODIGO = 3;

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/**
 * 'P-260915-K3F' — a identidade do pedido, e o que a Maynara lê para a cliente.
 *
 * Nasce no aparelho porque um sequencial humano exige alguém contando em um
 * lugar só, contar exige `runTransaction`, e transação exige rede. Um pedido
 * anotado na feira, sem sinal, não pode esperar um número (`Pedido.numero` fica
 * sem gravar por causa disso).
 *
 * A semente é parâmetro para que o teste possa fixá-la: o resto do app deixa o
 * padrão, que sorteia.
 */
export function codigoDoPedido(data: Date, semente: string = novoId()): string {
  const ano = doisDigitos(data.getFullYear() % 100);
  const mes = doisDigitos(data.getMonth() + 1);
  const dia = doisDigitos(data.getDate());

  const sufixo = semente
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CARACTERES_DO_CODIGO)
    .padEnd(CARACTERES_DO_CODIGO, "X");

  return `P-${ano}${mes}${dia}-${sufixo}`;
}

/**
 * O caminho normal de um pedido, do orçamento à entrega.
 * `CANCELADO` fica fora da fila: chega-se a ele de qualquer ponto.
 */
export const FLUXO_PEDIDO: StatusPedido[] = [
  "ORCAMENTO",
  "CONFIRMADO",
  "EM_PRODUCAO",
  "PRONTO",
  "ENTREGUE",
];

/**
 * Para onde este pedido pode ir: um passo adiante, um passo atrás, ou
 * cancelado. Voltar é sempre permitido — marcar "pronto" sem querer não pode
 * custar um pedido —, e cancelado reabre como orçamento.
 *
 * A regra mora aqui e é testada, em vez de espalhada pelos botões da tela.
 */
export function transicoesPermitidas(status: StatusPedido): StatusPedido[] {
  if (status === "CANCELADO") return ["ORCAMENTO"];

  const posicao = FLUXO_PEDIDO.indexOf(status);
  const adiante = FLUXO_PEDIDO[posicao + 1];
  const atras = posicao > 0 ? FLUXO_PEDIDO[posicao - 1] : undefined;

  return [
    ...(adiante ? [adiante] : []),
    ...(atras ? [atras] : []),
    "CANCELADO" as StatusPedido,
  ];
}

export function podeIrPara(de: StatusPedido, para: StatusPedido): boolean {
  return transicoesPermitidas(de).includes(para);
}

/** Pedido que saiu da agenda: entregue, ou que não vai acontecer. */
export function ehConcluido(status: StatusPedido): boolean {
  return status === "ENTREGUE" || status === "CANCELADO";
}

export interface AReceber {
  total: Centavos;
  quantidade: number;
  /** Dos que estão a receber, quantos já foram entregues. */
  entregues: number;
}

/**
 * O dinheiro combinado que ainda não entrou.
 *
 * Existe porque o painel financeiro é regime de caixa: um pedido entregue e não
 * pago não está no resultado do mês, e sem esta linha ele não estaria em lugar
 * nenhum — o painel mentiria por omissão (`DECISOES.md#d36`).
 *
 * O orçamento fica de fora: proposta que a cliente ainda não aceitou não é
 * dinheiro a receber, é dinheiro a combinar. Cancelado, pelo motivo oposto.
 *
 * Soma em memória sobre os pedidos que a tela já carregou: nenhum agregado
 * novo, nenhuma consulta nova.
 */
export function aReceber(
  pedidos: { status: StatusPedido; pago: boolean; total: Centavos }[],
): AReceber {
  const abertos = pedidos.filter(
    (pedido) =>
      !pedido.pago &&
      pedido.status !== "ORCAMENTO" &&
      pedido.status !== "CANCELADO",
  );

  return {
    total: abertos.reduce((soma, pedido) => soma + pedido.total, 0),
    quantidade: abertos.length,
    entregues: abertos.filter((pedido) => pedido.status === "ENTREGUE").length,
  };
}

export const ROTULO_STATUS_PEDIDO: Record<StatusPedido, string> = {
  ORCAMENTO: "Orçamento",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

/** O verbo do botão que leva o pedido para lá. */
export const ACAO_STATUS_PEDIDO: Record<StatusPedido, string> = {
  ORCAMENTO: "Voltar para orçamento",
  CONFIRMADO: "Confirmar pedido",
  EM_PRODUCAO: "Começar a produzir",
  PRONTO: "Marcar como pronto",
  ENTREGUE: "Marcar como entregue",
  CANCELADO: "Cancelar pedido",
};

export const ROTULO_TIPO_ENTREGA = {
  RETIRADA: "Retirada",
  ENTREGA: "Entrega",
} as const;

/**
 * O selo de "o preço desta ficha mudou", com a ação de usar o preço de hoje.
 *
 * Só enquanto o pedido é orçamento: de confirmado em diante o preço combinado
 * com a cliente é o preço, e um orçamento aceito não muda de valor porque o
 * chocolate subiu. O sistema mostra e oferece, nunca reprecifica pelas costas
 * dela (`DECISOES.md#d21`).
 */
export function ofereceOPrecoDeHoje(
  status: StatusPedido,
  precoUnitario: Centavos,
  precoDaFicha: Centavos | undefined,
): boolean {
  if (status !== "ORCAMENTO") return false;
  if (precoDaFicha === undefined) return false;
  return precoDaFicha !== precoUnitario;
}

export interface GrupoDeEntrega<T> {
  dataISO: DataISO;
  pedidos: T[];
}

/**
 * A agenda: os pedidos reunidos por dia de entrega, do mais próximo para o
 * mais distante. Data de entrega, e nunca data de pagamento — o dinheiro é
 * outro assunto, e ele mora no caixa.
 */
export function agruparPorEntrega<T extends { dataEntregaISO: DataISO }>(
  pedidos: T[],
): GrupoDeEntrega<T>[] {
  const grupos = new Map<DataISO, T[]>();

  for (const pedido of pedidos) {
    const dia = grupos.get(pedido.dataEntregaISO);
    if (dia) dia.push(pedido);
    else grupos.set(pedido.dataEntregaISO, [pedido]);
  }

  return [...grupos.entries()]
    .map(([dataISO, lista]) => ({ dataISO, pedidos: lista }))
    .sort((a, b) => a.dataISO.localeCompare(b.dataISO));
}

/** Números com vírgula, como o teclado brasileiro os escreve. */
function quantidadeEmTexto(quantidade: number): string {
  return String(quantidade).replace(".", ",");
}

/**
 * "20 × Cookie tradicional · 2 × Caixa com 6" — o que é o pedido, em uma linha.
 * Passando de `maximo` itens, o resto vira contagem: a linha da lista é uma
 * linha, e não um resumo do pedido inteiro.
 */
export function resumoDosItens(
  itens: { quantidade: number; nomeSnapshot: string }[],
  maximo = 2,
): string {
  if (itens.length === 0) return "Sem itens";

  const visiveis = itens
    .slice(0, maximo)
    .map(
      (item) => `${quantidadeEmTexto(item.quantidade)} × ${item.nomeSnapshot}`,
    )
    .join(" · ");

  const restantes = itens.length - maximo;
  if (restantes <= 0) return visiveis;

  return `${visiveis} · e mais ${restantes} ${restantes === 1 ? "item" : "itens"}`;
}
