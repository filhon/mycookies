import {
  addDoc,
  increment,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { colClientes, docCliente, docResumoGlobal } from "../colecoes";
import { ticketMedioDe } from "@/lib/domain/caixa";
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

  const referencia = await addDoc(colClientes(contaId), nova as Cliente);

  // Mesmo caminho de `totalInsumos` e `totalFichas`: `increment` entra na fila
  // offline e não exige leitura antes de escrever.
  await setDoc(
    docResumoGlobal(contaId),
    { v: VERSAO_SCHEMA, totalClientes: increment(1), atualizadoEm: momento },
    { merge: true },
  );

  return referencia.id;
}

export async function atualizarCliente(
  contaId: string,
  clienteId: string,
  dados: DadosCliente,
): Promise<void> {
  await updateDoc(docCliente(contaId, clienteId), {
    v: VERSAO_SCHEMA,
    nome: dados.nome.trim(),
    nomeBusca: chaveDeBusca(dados.nome),
    telefone: dados.telefone?.trim() ?? null,
    instagram: dados.instagram?.trim() ?? null,
    endereco: dados.endereco?.trim() ?? null,
    observacoes: dados.observacoes?.trim() ?? null,
    atualizadoEm: agora(),
  });
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

  await updateDoc(docCliente(contaId, cliente.id), {
    v: VERSAO_SCHEMA,
    totalPedidos: increment(delta.pedidos),
    totalGasto: increment(delta.gasto),
    ticketMedio: ticketMedioDe(totalGasto, totalPedidos),
    ...(pagoEm ? { ultimoPedidoEm: pagoEm } : {}),
    atualizadoEm: agora(),
  });
}
