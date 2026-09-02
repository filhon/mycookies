import {
  addDoc,
  increment,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { colClientes, docCliente, docResumoGlobal } from "../colecoes";
import { chaveDeBusca } from "@/lib/domain/custoInsumo";
import { VERSAO_SCHEMA } from "@/lib/types";
import type { Cliente } from "@/lib/types";

/**
 * Cadastro leve, e opcional.
 *
 * Um pedido não precisa de cliente cadastrada: `Pedido.clienteNome` é snapshot
 * e basta. O cadastro existe para a cliente que volta — a que tem telefone,
 * endereço e um jeito de embalar que ela precisa lembrar.
 *
 * Os agregados (`totalPedidos`, `totalGasto`, `ticketMedio`, `ultimoPedidoEm`)
 * nascem zerados e continuam zerados nesta sessão: eles são de dinheiro, e
 * dinheiro é a sessão 3B. Zero que não aparece em tela é ausência, não
 * resultado — a mesma regra de `DECISOES.md#d28`.
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
