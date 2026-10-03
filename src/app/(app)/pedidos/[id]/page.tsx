import { EditorPedido } from "@/components/pedidos/EditorPedido";

export const metadata = { title: "Pedido" };

/**
 * O id `novo` é o pedido que ainda não existe. Uma rota só para os dois casos
 * porque a tela é a mesma: o que muda é haver ou não documento por trás.
 *
 * Fora de `(coluna)` desde a 077 (`#d274`): abaixo de `2xl` a largura é a da
 * coluna, e a partir dele o resumo ganha a coluna à direita. A folha do
 * orçamento continua em `(coluna)`, impressa sem o shell (`#d106`).
 */
export default async function PaginaPedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl 2xl:max-w-324">
      <EditorPedido id={id} />
    </div>
  );
}
