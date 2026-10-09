import {
  doc,
  increment,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { obterDb } from "../client";
import {
  colClientes,
  docCliente,
  docPedido,
  docResumoGlobal,
} from "../colecoes";
import { despachar } from "./despachar";
import { ticketMedioDe } from "@/lib/domain/caixa";
import { contatoJuntado, juntarAgregados } from "@/lib/domain/clientes";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { Centavos, Cliente } from "@/lib/types";

/**
 * Cadastro leve, e opcional.
 *
 * Um pedido não precisa de cliente cadastrada: `Pedido.clienteNome` é snapshot
 * e basta. O cadastro existe para a cliente que volta — a que tem telefone,
 * endereço e um jeito de embalar que ela precisa lembrar.
 *
 * Os agregados nascem zerados e andam com o **pagamento**, e não com o pedido:
 * `totalGasto` é dinheiro que entrou, pela mesma regra do painel do mês.
 */
export interface DadosCliente {
  nome: string;
  telefone?: string;
  instagram?: string;
  endereco?: string;
  observacoes?: string;
}

function agora() {
  return Timestamp.now();
}

/** Toda cliente viva, por nome: o recorte é o arquivo (`#d105`). */
export function consultaClientes(contaId: string) {
  return query(
    colClientes(contaId),
    where("arquivado", "==", false),
    orderBy("nomeBusca"),
  );
}

/** Campo vazio não vira string vazia no documento: ele simplesmente não entra. */
function opcional(campo: string, valor: string | undefined) {
  const limpo = valor?.trim();
  return limpo ? { [campo]: limpo } : {};
}

export async function criarCliente(
  contaId: string,
  dados: DadosCliente,
): Promise<string> {
  const momento = agora();

  const nova: Omit<Cliente, "id"> = {
    v: VERSAO_SCHEMA,
    nome: dados.nome.trim(),
    nomeBusca: chaveDeBusca(dados.nome),
    ...opcional("telefone", dados.telefone),
    ...opcional("instagram", dados.instagram),
    ...opcional("endereco", dados.endereco),
    ...opcional("observacoes", dados.observacoes),
    totalPedidos: 0,
    totalGasto: 0,
    ticketMedio: 0,
    criadoEm: momento,
    atualizadoEm: momento,
    arquivado: false,
  };

  // O id nasce no aparelho, e as duas escritas são despachadas sem espera: uma
  // cliente cadastrada no meio de um pedido não pode depender de rede (`#d80`).
  const referencia = doc(colClientes(contaId));
  despachar(setDoc(referencia, nova as Cliente));

  // Mesmo caminho de `totalInsumos` e `totalFichas`: `increment` entra na fila
  // offline e não exige leitura antes de escrever.
  despachar(
    setDoc(
      docResumoGlobal(contaId),
      { v: VERSAO_SCHEMA, totalClientes: increment(1), atualizadoEm: momento },
      { merge: true },
    ),
  );

  return referencia.id;
}

export async function atualizarCliente(
  contaId: string,
  clienteId: string,
  dados: DadosCliente,
): Promise<void> {
  despachar(
    updateDoc(docCliente(contaId, clienteId), {
      v: VERSAO_SCHEMA,
      nome: dados.nome.trim(),
      nomeBusca: chaveDeBusca(dados.nome),
      telefone: dados.telefone?.trim() ?? null,
      instagram: dados.instagram?.trim() ?? null,
      endereco: dados.endereco?.trim() ?? null,
      observacoes: dados.observacoes?.trim() ?? null,
      atualizadoEm: agora(),
    }),
  );
}

/** O que os agregados do cliente precisam saber dele antes de andar. */
export type ClienteAgregavel = Pick<
  Cliente,
  "id" | "totalPedidos" | "totalGasto"
>;

export interface DeltaDoCliente {
  /** `+1` no pagamento, `−1` no desfazer, `0` quando só o valor mudou. */
  pedidos: number;
  gasto: Centavos;
}

/**
 * Move os agregados da cliente junto com o pagamento do pedido.
 *
 * `totalPedidos` e `totalGasto` são incrementos, e por isso revertem exatos.
 * `ticketMedio` é razão e não se incrementa: vai por valor, a partir do que a
 * tela já sabe — a mesma regra do ticket médio do mês (`DECISOES.md#d36`).
 *
 * `ultimoPedidoEm` **não volta atrás no desfazer**, e é de propósito: o campo
 * guarda uma data e não uma soma, e não há histórico para restaurar a anterior.
 * Uma data recuada para um valor que ninguém registrou seria pior do que uma
 * data que ficou parada.
 */
export async function aplicarPedidoNoCliente(
  contaId: string,
  cliente: ClienteAgregavel,
  delta: DeltaDoCliente,
  /** A data do pagamento, ou `null` quando o pagamento não é o que mudou. */
  pagoEm: Timestamp | null,
): Promise<void> {
  const totalPedidos = cliente.totalPedidos + delta.pedidos;
  const totalGasto = cliente.totalGasto + delta.gasto;

  despachar(
    updateDoc(docCliente(contaId, cliente.id), {
      v: VERSAO_SCHEMA,
      totalPedidos: increment(delta.pedidos),
      totalGasto: increment(delta.gasto),
      ticketMedio: ticketMedioDe(totalGasto, totalPedidos),
      ...(pagoEm ? { ultimoPedidoEm: pagoEm } : {}),
      atualizadoEm: agora(),
    }),
  );
}

/**
 * Tocar "Chamar" deixa marca (`DECISOES.md#d312`), despachada sem espera junto
 * da abertura do WhatsApp: grava no aparelho sem rede, e a linha muda na hora.
 */
export async function marcarChamada(
  contaId: string,
  clienteId: string,
): Promise<void> {
  const momento = agora();
  despachar(
    updateDoc(docCliente(contaId, clienteId), {
      v: VERSAO_SCHEMA,
      chamadaEm: momento,
      atualizadoEm: momento,
    }),
  );
}

/** Até 499 escritas num lote (`#d311`); três são das duas e do contador. */
export const LIMITE_PEDIDOS_AO_JUNTAR = 499 - 3;

/**
 * A mesma pessoa cadastrada duas vezes vira uma (`DECISOES.md#d311`), num lote
 * só, que funciona sem rede: os pedidos de `sai` passam para `fica` (o
 * `clienteNome` deles é snapshot do dia e não muda, `#d35`), `fica` recebe a
 * soma e o contato que lhe faltava, e `sai` é arquivada com `juntadaEm`. Nada é
 * apagado. `pedidoIds` são os pedidos de `sai` que a tela já leu.
 */
export async function juntarClientes(
  contaId: string,
  fica: Cliente,
  sai: Cliente,
  pedidoIds: string[],
): Promise<void> {
  if (pedidoIds.length > LIMITE_PEDIDOS_AO_JUNTAR) {
    throw new Error(
      `${sai.nome} tem pedidos demais para juntar de uma vez. Nada foi mudado.`,
    );
  }
  const momento = agora();
  const juntos = juntarAgregados(fica, sai);
  const lote = writeBatch(obterDb());
  for (const pedidoId of pedidoIds) {
    lote.update(docPedido(contaId, pedidoId), {
      v: VERSAO_SCHEMA,
      clienteId: fica.id,
      atualizadoEm: momento,
    });
  }
  lote.update(docCliente(contaId, fica.id), {
    v: VERSAO_SCHEMA,
    // Incremento, como no pagamento: um pagamento de `fica` noutro aparelho,
    // ainda na fila, não se perde.
    totalPedidos: increment(sai.totalPedidos),
    totalGasto: increment(sai.totalGasto),
    ticketMedio: juntos.ticketMedio,
    ...(juntos.ultimoPedidoEm ? { ultimoPedidoEm: juntos.ultimoPedidoEm } : {}),
    ...contatoJuntado(fica, sai),
    atualizadoEm: momento,
  });
  lote.update(docCliente(contaId, sai.id), {
    v: VERSAO_SCHEMA,
    arquivado: true,
    juntadaEm: { clienteId: fica.id, em: momento },
    atualizadoEm: momento,
  });
  lote.set(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalClientes: increment(-1), atualizadoEm: momento },
    { merge: true },
  );
  despachar(lote.commit());
}

/**
 * Arquiva em vez de apagar: os pedidos dela apontam para este id, e o que ela
 * gastou fica guardado. O que muda depois está em `DECISOES.md#d138`.
 */
export async function arquivarCliente(
  contaId: string,
  clienteId: string,
): Promise<void> {
  const momento = agora();
  despachar(
    updateDoc(docCliente(contaId, clienteId), {
      v: VERSAO_SCHEMA,
      arquivado: true,
      atualizadoEm: momento,
    }),
  );
  despachar(
    setDoc(
      docResumoGlobal(contaId),
      { v: VERSAO_SCHEMA, totalClientes: increment(-1), atualizadoEm: momento },
      { merge: true },
    ),
  );
}
