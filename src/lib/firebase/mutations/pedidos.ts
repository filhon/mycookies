import { addDoc, Timestamp, updateDoc } from "firebase/firestore";
import { colPedidos, docPedido } from "../colecoes";
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

export async function atualizarPedido(
  contaId: string,
  pedidoId: string,
  dados: DadosPedido,
): Promise<void> {
  await updateDoc(docPedido(contaId, pedidoId), {
    ...corpoDoPedido(dados),
    atualizadoEm: agora(),
  });
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
  pedido: Pick<Pedido, "id" | "status">,
  proximo: StatusPedido,
): Promise<void> {
  if (!podeIrPara(pedido.status, proximo)) {
    throw new Error(
      `Um pedido em "${ROTULO_STATUS_PEDIDO[pedido.status]}" não vai direto para "${ROTULO_STATUS_PEDIDO[proximo]}".`,
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
