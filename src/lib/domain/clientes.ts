import type { Cliente, DataISO } from "@/lib/types";
import { rotuloDia } from "./datas";
import { formatarMoeda } from "./money";

/** O que a ordem da tela precisa saber de uma cliente. */
export type ClienteOrdenavel = Pick<
  Cliente,
  "nomeBusca" | "totalPedidos" | "totalGasto"
>;

/**
 * Quem mais deixou dinheiro no caixa primeiro. Empate por pedidos pagos, depois
 * por nome; quem nunca pagou um pedido vai para o fim, por nome (`#d137`).
 */
export function ordenarPorGasto<C extends ClienteOrdenavel>(
  clientes: C[],
): C[] {
  return [...clientes].sort(
    (a, b) =>
      b.totalGasto - a.totalGasto ||
      b.totalPedidos - a.totalPedidos ||
      a.nomeBusca.localeCompare(b.nomeBusca),
  );
}

/**
 * "3 pedidos pagos · R$ 40,00 em média · último em 12 de ago.", ou "ainda sem
 * pedido pago". Conta o que entrou no caixa, como o painel do mês (`#d36`).
 * Com um pedido só, a média é o total e não se repete.
 */
export function resumoDaCliente(
  cliente: Pick<Cliente, "totalPedidos" | "ticketMedio">,
  ultimoPedidoISO: DataISO | null,
): string {
  if (cliente.totalPedidos <= 0) return "ainda sem pedido pago";
  const partes = [
    cliente.totalPedidos === 1
      ? "1 pedido pago"
      : `${cliente.totalPedidos} pedidos pagos`,
  ];
  if (cliente.totalPedidos > 1) {
    partes.push(`${formatarMoeda(cliente.ticketMedio)} em média`);
  }
  if (ultimoPedidoISO) partes.push(`último em ${rotuloDia(ultimoPedidoISO)}`);
  return partes.join(" · ");
}
