import type { Cliente, DataISO } from "@/lib/types";
import { chaveDeBusca } from "./custoInsumo";
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

/**
 * A observação fala de alergia: "Alérgica a amendoim", "ALERGIA", "alergico"
 * (`#d308`). A ficha da cliente passa a faixa de informativa para atenção.
 */
export function temAlergia(observacoes: string | undefined): boolean {
  return chaveDeBusca(observacoes ?? "").includes("alerg");
}

/**
 * O perfil dela no Instagram, do jeito que o campo foi escrito: "@ana.doces",
 * "ana.doces" ou o link colado. `null` quando não dá para ser um usuário: o
 * botão não aparece em vez de abrir uma página que não existe.
 */
export function instagramParaLink(usuario: string | undefined): string | null {
  const nome = (usuario ?? "")
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(nome)
    ? `https://instagram.com/${nome}`
    : null;
}
