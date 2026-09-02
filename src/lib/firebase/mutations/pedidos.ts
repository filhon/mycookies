import { addDoc, deleteField, Timestamp, updateDoc } from "firebase/firestore";
import { colPedidos, docPedido } from "../colecoes";
import {
  aplicarNoAgregado,
  diaDoPagamento,
  pedidoAgregavel,
  type PedidoNoCaixa,
} from "./agregado";
import { aplicarPedidoNoCliente, type ClienteAgregavel } from "./clientes";
import {
  arquivarDocumentoDaTransacao,
  corrigirValorDaTransacao,
  gravarTransacao,
} from "./transacoes";
import type { ContextoMeta } from "./metas";
import {
  deltaDaTransacao,
  deltaDoPedido,
  somarParcelas,
  ticketMedioDe,
  type ParcelasDoAgregado,
} from "@/lib/domain/caixa";
import { competenciaDeISO, dataDeISO } from "@/lib/domain/datas";
import {
  codigoDoPedido,
  derivarPedido,
  podeIrPara,
  ROTULO_STATUS_PEDIDO,
} from "@/lib/domain/pedido";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  Centavos,
  CompetenciaMensal,
  DataISO,
  FormaPagamento,
  ItemPedido,
  Pedido,
  StatusPedido,
} from "@/lib/types";

/** Uma linha do pedido como o editor a entrega, com preço e custo congelados. */
export interface ItemDoPedido {
  fichaTecnicaId: string;
  nomeSnapshot: string;
  quantidade: number;
  /**
   * Preço da ficha no instante em que o item entrou no pedido. Mudar a
   * quantidade multiplica este número; nunca busca o preço de hoje.
   */
  precoUnitario: Centavos;
  custoUnitarioSnapshot: Centavos;
  observacao?: string;
}

export interface DadosPedido {
  /** Opcional: a cliente da feira não vira cadastro. */
  clienteId?: string;
  clienteNome: string;
  clienteTelefone?: string;

  itens: ItemDoPedido[];
  status: StatusPedido;
  dataEntregaISO: DataISO;

  entrega: {
    tipo: "RETIRADA" | "ENTREGA";
    taxa: Centavos;
    endereco?: string;
  };

  desconto: Centavos;
  formaPagamentoId?: string;
  /** As formas da conta, para congelar a taxa da maquininha sobre o total. */
  formasPagamento: FormaPagamento[];

  observacoes?: string;
}

function agora() {
  return Timestamp.now();
}

/** A mesma ficha pode aparecer em duas linhas do pedido. */
function idsUnicos(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** Campo apagado vira `null`, e não campo ausente. Ver `corpoDoPedido`. */
function texto(valor: string | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

/**
 * Tudo que o pedido grava além do que ela digitou.
 *
 * Os derivados saem de `derivarPedido`, a mesma função que o rodapé do editor
 * usa: o total que ela mostrou para a cliente é o total que vai para o banco.
 *
 * Os campos opcionais gravam `null` em vez de sumir do objeto porque o mesmo
 * corpo serve às duas escritas: em `updateDoc`, uma chave ausente mantém o
 * valor antigo, e o endereço que ela apagou continuaria lá.
 */
function corpoDoPedido(dados: DadosPedido) {
  const forma = dados.formaPagamentoId
    ? dados.formasPagamento.find((item) => item.id === dados.formaPagamentoId)
    : undefined;

  const derivado = derivarPedido({
    itens: dados.itens,
    desconto: dados.desconto,
    taxaEntrega: dados.entrega.taxa,
    forma,
  });

  const itens: ItemPedido[] = dados.itens.map((item, indice) => ({
    fichaTecnicaId: item.fichaTecnicaId,
    nomeSnapshot: item.nomeSnapshot,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    custoUnitarioSnapshot: item.custoUnitarioSnapshot,
    subtotal: derivado.linhas[indice]?.subtotal ?? 0,
    ...(texto(item.observacao) ? { observacao: item.observacao?.trim() } : {}),
  }));

  return {
    v: VERSAO_SCHEMA,

    clienteId: dados.clienteId ?? null,
    clienteNome: dados.clienteNome.trim(),
    clienteTelefone: texto(dados.clienteTelefone),

    itens,
    // Espelho consultável por `array-contains`: "quais pedidos levam esta
    // ficha?" é a pergunta da lista de compras, na sessão 3C.
    fichaIds: idsUnicos(itens.map((item) => item.fichaTecnicaId)),

    status: dados.status,
    dataEntrega: Timestamp.fromDate(dataDeISO(dados.dataEntregaISO)),
    dataEntregaISO: dados.dataEntregaISO,
    competencia: competenciaDeISO(dados.dataEntregaISO),

    entrega: {
      tipo: dados.entrega.tipo,
      taxa: derivado.taxaEntrega,
      endereco: texto(dados.entrega.endereco),
    },

    subtotal: derivado.subtotal,
    // O desconto gravado é o limitado, e não o digitado: o documento guarda o
    // que de fato valeu, senão subtotal e total não fecham entre si.
    desconto: derivado.desconto,
    total: derivado.total,

    formaPagamentoId: dados.formaPagamentoId ?? null,
    custoTaxaPagamento: derivado.custoTaxaPagamento,

    custoTotalEstimado: derivado.custoTotalEstimado,
    lucroEstimado: derivado.lucroEstimado,

    observacoes: texto(dados.observacoes),
  };
}

export async function criarPedido(
  contaId: string,
  dados: DadosPedido,
): Promise<string> {
  const momento = agora();

  const novo = {
    ...corpoDoPedido(dados),
    // Nasce no aparelho, porque um pedido anotado na feira sem sinal não pode
    // esperar um número do servidor. `numero` fica sem gravar de propósito.
    codigo: codigoDoPedido(momento.toDate()),
    pago: false,
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  const referencia = await addDoc(
    colPedidos(contaId),
    novo as unknown as Pedido,
  );
  return referencia.id;
}

/**
 * O que a tela sabe do mês do pagamento, para que a mutação não leia nada.
 *
 * Mesma troca de `DECISOES.md#d29`, agora com dois números a mais: o espelho da
 * meta e o ticket médio são escritos por valor, e os dois precisam do estado do
 * agregado antes do delta. A tela de pedido já assina o agregado e a meta do
 * mês do pagamento — são dois documentos pequenos.
 */
export interface ContextoPagamento extends ContextoMeta {
  /** `receitaPedidos` do agregado antes deste delta. */
  receitaPedidos: Centavos;
  /** `qtdPedidos` do agregado antes deste delta. */
  qtdPedidos: number;
}

/**
 * O ticket médio como fica depois do delta, ou `null` quando não há como saber.
 *
 * `null` deixa o campo fora da escrita, e campo fora de um `merge` mantém o que
 * está lá: melhor um ticket médio parado do que um reescrito a partir de um
 * total que esta chamada não conhecia. Quem conserta é "Recalcular o mês".
 */
function ticketMedioApos(
  competencia: CompetenciaMensal,
  parcelas: ParcelasDoAgregado,
  contexto: ContextoPagamento | null,
): Centavos | null {
  if (!contexto || contexto.competencia !== competencia) return null;

  return ticketMedioDe(
    contexto.receitaPedidos + parcelas.receitaPedidos,
    contexto.qtdPedidos + parcelas.qtdPedidos,
  );
}

/** "Pedido P-260915-K3F · Ana Beatriz" — o que a linha do caixa diz. */
function descricaoDaVenda(pedido: Pick<Pedido, "codigo" | "clienteNome">) {
  return `Pedido ${pedido.codigo} · ${pedido.clienteNome}`;
}

/** O que a contribuição no caixa precisa saber do pedido. Nada além disso. */
type PedidoPago = PedidoNoCaixa & { custoTaxaPagamento: Centavos };

/**
 * A contribuição do pedido pago no agregado: a do lançamento e a do pedido.
 *
 * As duas nascem juntas e são somadas antes de virar escrita, porque cada
 * chamada a `aplicarNoAgregado` reescreve o espelho da meta por valor: aplicar
 * uma de cada vez faria a segunda gravar o espelho de antes da primeira.
 *
 * O lançamento é reconstruído a partir do próprio pedido, e não lido do banco:
 * os dois nasceram do mesmo número no pagamento, então o pedido sabe exatamente
 * o que reverter — e reverter sem ler é o que permite desfazer sem rede.
 */
function contribuicaoDoPedidoPago(
  pedido: PedidoPago,
  pagoEmISO: DataISO,
  sinal: 1 | -1,
): ParcelasDoAgregado {
  return somarParcelas(
    deltaDaTransacao(
      {
        tipo: "ENTRADA",
        categoria: "VENDA",
        valor: pedido.total,
        dataISO: pagoEmISO,
        custoTaxa: pedido.custoTaxaPagamento,
      },
      sinal,
    ),
    deltaDoPedido(pedidoAgregavel(pedido, pagoEmISO), sinal),
  );
}

export async function atualizarPedido(
  contaId: string,
  anterior: Pedido,
  dados: DadosPedido,
  /** Só faz falta quando o pedido já está pago. */
  contexto: ContextoPagamento | null = null,
  cliente: ClienteAgregavel | null = null,
): Promise<void> {
  const corpo = corpoDoPedido(dados);

  await updateDoc(docPedido(contaId, anterior.id), {
    ...corpo,
    atualizadoEm: agora(),
  });

  if (!anterior.pago || !anterior.pagoEm) return;

  // Editar um pedido pago é reverter mais aplicar, como na 4A. O dia do
  // pagamento não se mexe aqui: o que mudou foi a encomenda, não a data em que
  // o dinheiro entrou.
  const pagoEmISO = diaDoPagamento(anterior);
  const competencia =
    anterior.competenciaPagamento ?? competenciaDeISO(pagoEmISO);

  if (anterior.transacaoId) {
    await corrigirValorDaTransacao(contaId, anterior.transacaoId, {
      valor: corpo.total,
      custoTaxa: corpo.custoTaxaPagamento,
      descricao: descricaoDaVenda({
        codigo: anterior.codigo,
        clienteNome: corpo.clienteNome,
      }),
    });
  }

  const parcelas = somarParcelas(
    contribuicaoDoPedidoPago(anterior, pagoEmISO, -1),
    contribuicaoDoPedidoPago(corpo, pagoEmISO, 1),
  );

  await aplicarNoAgregado(
    contaId,
    competencia,
    parcelas,
    contexto,
    ticketMedioApos(competencia, parcelas, contexto),
  );

  if (cliente) {
    await aplicarPedidoNoCliente(
      contaId,
      cliente,
      { pedidos: 0, gasto: corpo.total - anterior.total },
      null,
    );
  }
}

/**
 * O pedido vira dinheiro no caixa.
 *
 * Três documentos andam juntos: o lançamento nasce, o pedido guarda o vínculo e
 * a competência do pagamento, e o agregado recebe as duas contribuições
 * somadas. A cliente cadastrada é o quarto, quando existe.
 *
 * A data que manda é a do **pagamento**, e não a da entrega: o painel é regime
 * de caixa, e um pedido entregue em 30/09 e pago em 02/10 conta em outubro
 * (`DECISOES.md#d36`).
 */
export async function marcarPedidoPago(
  contaId: string,
  pedido: Pedido,
  pagoEmISO: DataISO,
  formas: FormaPagamento[],
  contexto: ContextoPagamento | null,
  cliente: ClienteAgregavel | null,
): Promise<void> {
  if (pedido.pago) return;

  const competencia = competenciaDeISO(pagoEmISO);
  const pagoEm = Timestamp.fromDate(dataDeISO(pagoEmISO));

  const { id: transacaoId } = await gravarTransacao(
    contaId,
    {
      tipo: "ENTRADA",
      categoria: "VENDA",
      descricao: descricaoDaVenda(pedido),
      valor: pedido.total,
      dataISO: pagoEmISO,
      formaPagamentoId: pedido.formaPagamentoId ?? undefined,
      recorrente: false,
      pedidoId: pedido.id,
      // A taxa do pedido e a do lançamento precisam ser o mesmo número, e o
      // número que vale é o que o rodapé mostrou para ela (`#d24`).
      custoTaxa: pedido.custoTaxaPagamento,
    },
    formas,
  );

  await updateDoc(docPedido(contaId, pedido.id), {
    pago: true,
    pagoEm,
    competenciaPagamento: competencia,
    transacaoId,
    atualizadoEm: agora(),
  });

  const parcelas = contribuicaoDoPedidoPago(pedido, pagoEmISO, 1);
  await aplicarNoAgregado(
    contaId,
    competencia,
    parcelas,
    contexto,
    ticketMedioApos(competencia, parcelas, contexto),
  );

  if (cliente) {
    await aplicarPedidoNoCliente(
      contaId,
      cliente,
      { pedidos: 1, gasto: pedido.total },
      pagoEm,
    );
  }
}

/**
 * Desfaz o pagamento: o lançamento é **arquivado, nunca apagado**, e cada
 * número volta ao que era.
 *
 * O agregado do mês do pagamento é que se mexe, e não o de hoje: um pagamento
 * de setembro desfeito em outubro sai de setembro.
 */
export async function desfazerPagamento(
  contaId: string,
  pedido: Pedido,
  contexto: ContextoPagamento | null,
  cliente: ClienteAgregavel | null,
): Promise<void> {
  if (!pedido.pago || !pedido.pagoEm) return;

  const pagoEmISO = diaDoPagamento(pedido);
  const competencia =
    pedido.competenciaPagamento ?? competenciaDeISO(pagoEmISO);

  if (pedido.transacaoId) {
    await arquivarDocumentoDaTransacao(contaId, pedido.transacaoId);
  }

  await updateDoc(docPedido(contaId, pedido.id), {
    pago: false,
    pagoEm: deleteField(),
    competenciaPagamento: deleteField(),
    transacaoId: deleteField(),
    atualizadoEm: agora(),
  });

  const parcelas = contribuicaoDoPedidoPago(pedido, pagoEmISO, -1);
  await aplicarNoAgregado(
    contaId,
    competencia,
    parcelas,
    contexto,
    ticketMedioApos(competencia, parcelas, contexto),
  );

  if (cliente) {
    await aplicarPedidoNoCliente(
      contaId,
      cliente,
      { pedidos: -1, gasto: -pedido.total },
      null,
    );
  }
}

/**
 * Move o pedido um passo na fila, um passo atrás, ou para cancelado.
 *
 * A regra é a de `transicoesPermitidas`, e ela é conferida aqui também: a tela
 * só oferece o que pode, mas uma tela aberta há meia hora pode estar oferecendo
 * o que já não vale.
 *
 * Cancelar **não** apaga o documento: `arquivado` é outra coisa, e é o que se
 * faz com o pedido duplicado.
 */
export async function mudarStatusPedido(
  contaId: string,
  pedido: Pick<Pedido, "id" | "status" | "pago">,
  proximo: StatusPedido,
): Promise<void> {
  if (!podeIrPara(pedido.status, proximo)) {
    throw new Error(
      `Um pedido em "${ROTULO_STATUS_PEDIDO[pedido.status]}" não vai direto para "${ROTULO_STATUS_PEDIDO[proximo]}".`,
    );
  }

  // Cancelar um pedido pago sem desfazer o pagamento deixaria o dinheiro no
  // caixa de uma venda que não aconteceu. A ordem é sempre desfazer primeiro.
  if (proximo === "CANCELADO" && pedido.pago) {
    throw new Error(
      "Este pedido está pago. Desfaça o pagamento antes de cancelar, para que o dinheiro saia do caixa junto.",
    );
  }

  await updateDoc(docPedido(contaId, pedido.id), {
    status: proximo,
    atualizadoEm: agora(),
  });
}

/**
 * Some da lista, e continua no banco. É o que se faz com o pedido duplicado —
 * cancelar é para o pedido que existiu e não vai acontecer.
 */
export async function arquivarPedido(
  contaId: string,
  pedidoId: string,
): Promise<void> {
  await updateDoc(docPedido(contaId, pedidoId), {
    arquivado: true,
    atualizadoEm: agora(),
  });
}
