import {
  deleteField,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { obterDb } from "../client";
import { colPedidos, docPedido } from "../colecoes";
import {
  aplicarNoAgregado,
  diaDoPagamento,
  pedidoAgregavel,
  type PedidoNoCaixa,
} from "./agregado";
import { aplicarPedidoNoCliente, type ClienteAgregavel } from "./clientes";
import { despachar } from "./despachar";
import {
  arquivarDocumentoDaTransacao,
  arquivarTransacao,
  corrigirValorDaTransacao,
  criarTransacao,
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
import { competenciaDeISO, dataDeISO, dataISODe } from "@/lib/domain/datas";
import {
  codigoDoPedido,
  derivarPedido,
  descricaoDoRepasse,
  podeIrPara,
  ROTULO_STATUS_PEDIDO,
  type EntregaAPagar,
  type PedidoParaEntrega,
  type RepasseFeito,
} from "@/lib/domain/pedido";
import { VERSAO_SCHEMA } from "@/lib/types";
import type {
  Centavos,
  CompetenciaMensal,
  DataISO,
  EscolhaFeita,
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
  /** Numa linha de combo, já é o custo montado (`DECISOES.md#d100`). */
  custoUnitarioSnapshot: Centavos;
  observacao?: string;
  escolhas?: EscolhaFeita[];
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
    ...(item.escolhas?.length ? { escolhas: item.escolhas } : {}),
  }));

  return {
    v: VERSAO_SCHEMA,

    clienteId: dados.clienteId ?? null,
    clienteNome: dados.clienteNome.trim(),
    clienteTelefone: texto(dados.clienteTelefone),

    itens,
    // Espelho consultável por `array-contains`: "quais pedidos levam esta
    // ficha?" é a pergunta da lista de compras, na sessão 3C. As fichas
    // escolhidas entram também: um pedido de combo com nutella contém nutella.
    fichaIds: idsUnicos(
      itens.flatMap((item) => [
        item.fichaTecnicaId,
        ...(item.escolhas ?? []).map((escolha) => escolha.fichaTecnicaId),
      ]),
    ),

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

  // O id sai de `doc()`, gerado no aparelho, e a escrita é despachada: um
  // pedido anotado na feira sem sinal não espera o servidor (`#d80`).
  const referencia = doc(colPedidos(contaId));
  despachar(setDoc(referencia, novo as unknown as Pedido));
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

  // O mapa `entrega` vai por **caminho pontilhado**, e não inteiro: gravá-lo
  // inteiro apagaria `repassadoEm` e `repasseTransacaoId`, e a entrega já
  // acertada voltaria para a faixa de "a pagar" — ela pagaria duas vezes.
  const { entrega, ...resto } = corpo;

  despachar(
    updateDoc(docPedido(contaId, anterior.id), {
      ...resto,
      "entrega.tipo": entrega.tipo,
      "entrega.taxa": entrega.taxa,
      "entrega.endereco": entrega.endereco,
      atualizadoEm: agora(),
    }),
  );

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

  despachar(
    updateDoc(docPedido(contaId, pedido.id), {
      pago: true,
      pagoEm,
      competenciaPagamento: competencia,
      transacaoId,
      atualizadoEm: agora(),
    }),
  );

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

  despachar(
    updateDoc(docPedido(contaId, pedido.id), {
      pago: false,
      pagoEm: deleteField(),
      competenciaPagamento: deleteField(),
      transacaoId: deleteField(),
      atualizadoEm: agora(),
    }),
  );

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

  despachar(
    updateDoc(docPedido(contaId, pedido.id), {
      status: proximo,
      atualizadoEm: agora(),
    }),
  );
}

// ---------------------------------------------------------------------------
// O acerto das entregas (spec 012)
// ---------------------------------------------------------------------------

/**
 * O pedido gravado, do jeito que o acerto das entregas o lê.
 *
 * `Timestamp` não atravessa para `domain/` (`#d84` e o comentário de
 * `estoque.ts`): a conversão acontece aqui, como `pedidoAgregavel` faz com
 * `pagoEm`.
 */
export function pedidoParaEntrega(pedido: Pedido): PedidoParaEntrega {
  return {
    id: pedido.id,
    codigo: pedido.codigo,
    clienteNome: pedido.clienteNome,
    dataEntregaISO: pedido.dataEntregaISO,
    status: pedido.status,
    entrega: {
      tipo: pedido.entrega.tipo,
      taxa: pedido.entrega.taxa,
      ...(pedido.entrega.repassadoEm
        ? { repassadoEmISO: dataISODe(pedido.entrega.repassadoEm.toDate()) }
        : {}),
      ...(pedido.entrega.repasseTransacaoId
        ? { repasseTransacaoId: pedido.entrega.repasseTransacaoId }
        : {}),
    },
  };
}

/**
 * O acerto da semana com o entregador: uma saída no caixa, e os pedidos
 * marcados.
 *
 * A saída nasce **sem `pedidoId`**: um acerto cobre vários pedidos, e o campo é
 * de um só. O vínculo existe na direção que importa e que é consultável de
 * graça — do pedido para o lançamento (`DECISOES.md#d85`).
 *
 * `contextoMeta` é `null`, e isso foi conferido em `metas.ts` e não deduzido:
 * `espelhoAposDelta` move o espelho a partir de `parcelas.entradas`, e o delta
 * de uma saída tem `entradas` zerado. `null` diz isso em vez de depender da
 * coincidência — é o mesmo que a 6B fez.
 *
 * As formas de pagamento vão vazias porque `custoTaxa` já é zero e explícito:
 * saída não passa por maquininha, e isso dispensa o painel de assinar
 * `configuracao/geral` para gravar um zero.
 *
 * Despacha e não espera (`#d80`): acertar a semana precisa funcionar na cozinha,
 * com o celular sem sinal.
 */
export async function pagarEntregas(
  contaId: string,
  entregas: EntregaAPagar[],
  dataISO: DataISO,
): Promise<string> {
  const transacaoId = await criarTransacao(
    contaId,
    {
      tipo: "SAIDA",
      categoria: "ENTREGA",
      descricao: descricaoDoRepasse(entregas),
      valor: entregas.reduce((soma, entrega) => soma + entrega.valor, 0),
      dataISO,
      recorrente: false,
      custoTaxa: 0,
    },
    [],
    null,
  );

  // Caminho pontilhado, e não o mapa `entrega` inteiro: gravar o mapa apagaria
  // o endereço e a taxa. É a linha mais fácil de errar desta spec.
  const repassadoEm = Timestamp.fromDate(dataDeISO(dataISO));
  const lote = writeBatch(obterDb());
  for (const entrega of entregas) {
    lote.update(docPedido(contaId, entrega.pedidoId), {
      "entrega.repassadoEm": repassadoEm,
      "entrega.repasseTransacaoId": transacaoId,
      atualizadoEm: repassadoEm,
    });
  }
  despachar(lote.commit());

  return transacaoId;
}

/**
 * Desfaz um acerto: o lançamento é **arquivado, nunca apagado**, o resultado do
 * mês volta ao que era, e os pedidos voltam para a faixa.
 *
 * O lançamento é reconstruído a partir do próprio grupo, e não lido do banco —
 * os dois nasceram do mesmo número em `pagarEntregas`, então o grupo sabe
 * exatamente o que reverter, e reverter sem ler é o que permite desfazer sem
 * rede. É o mesmo arranjo de `contribuicaoDoPedidoPago`.
 */
export async function desfazerRepasse(
  contaId: string,
  repasse: RepasseFeito,
): Promise<void> {
  await arquivarTransacao(
    contaId,
    {
      id: repasse.transacaoId,
      competencia: competenciaDeISO(repasse.repassadoEmISO),
      tipo: "SAIDA",
      categoria: "ENTREGA",
      valor: repasse.total,
      dataISO: repasse.repassadoEmISO,
      custoTaxa: 0,
    },
    null,
  );

  const momento = agora();
  const lote = writeBatch(obterDb());
  for (const pedidoId of repasse.pedidoIds) {
    lote.update(docPedido(contaId, pedidoId), {
      "entrega.repassadoEm": deleteField(),
      "entrega.repasseTransacaoId": deleteField(),
      atualizadoEm: momento,
    });
  }
  despachar(lote.commit());
}

/**
 * Some da lista, e continua no banco. É o que se faz com o pedido duplicado —
 * cancelar é para o pedido que existiu e não vai acontecer.
 */
export async function arquivarPedido(
  contaId: string,
  pedidoId: string,
): Promise<void> {
  despachar(
    updateDoc(docPedido(contaId, pedidoId), {
      arquivado: true,
      atualizadoEm: agora(),
    }),
  );
}
