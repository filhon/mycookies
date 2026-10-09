import type { Cliente, DataISO } from "@/lib/types";
import { chaveDeBusca } from "./custoInsumo";
import { diasEntre, rotuloDia } from "./datas";
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

/** A partir de quantos dias sem pedido pago a cliente parou (`#d309`). */
export const DIAS_SEM_PEDIR = 30;

/**
 * Onde a cliente está, só pelos agregados do documento (`#d309`). Toda cliente
 * cai em exatamente um. `ultimoPedidoEm` é a data do **pagamento** e não volta
 * no desfazer (`#d37`), e o momento herda isso.
 */
export type MomentoDaCliente =
  "voltam" | "novas" | "sumiram" | "uma-vez" | "sem-pedido";

/** Dias desde o último pedido pago, nunca negativo; `null` sem a data. */
export function diasSemPedir(
  ultimoPedidoISO: DataISO | null,
  hoje: DataISO,
): number | null {
  return ultimoPedidoISO ? Math.max(0, diasEntre(ultimoPedidoISO, hoje)) : null;
}

export function momentoDaCliente(
  cliente: Pick<Cliente, "totalPedidos">,
  ultimoPedidoISO: DataISO | null,
  hoje: DataISO,
): MomentoDaCliente {
  if (cliente.totalPedidos <= 0) return "sem-pedido";
  // Pedido pago sem a data não diz que foi recente: conta como parada.
  const dias = diasSemPedir(ultimoPedidoISO, hoje) ?? Infinity;
  const recente = dias < DIAS_SEM_PEDIR;
  if (cliente.totalPedidos === 1) return recente ? "novas" : "uma-vez";
  return recente ? "voltam" : "sumiram";
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
