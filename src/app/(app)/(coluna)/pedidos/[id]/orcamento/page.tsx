import { TelaOrcamento } from "@/components/pedidos/TelaOrcamento";

export const metadata = { title: "Orçamento" };

/** A folha do pedido, pronta para o navegador imprimir (spec 017). */
export default async function PaginaOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TelaOrcamento id={id} />;
}
