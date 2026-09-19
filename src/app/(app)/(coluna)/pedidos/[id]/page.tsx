import { EditorPedido } from "@/components/pedidos/EditorPedido";

export const metadata = { title: "Pedido" };

/**
 * O id `novo` é o pedido que ainda não existe. Uma rota só para os dois casos
 * porque a tela é a mesma: o que muda é haver ou não documento por trás.
 */
export default async function PaginaPedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorPedido id={id} />;
}
