import { lerEventoDoPedido } from "@/lib/server/cardapio";

/**
 * "Pôr na agenda do celular" (spec 172): o `.ics` do pedido, com as guardas da
 * página (`pedidoPelaChave`). Fora do orçamento, não cancelado, não entregue e
 * com o dia por vir; fora disso, o mesmo 404 que não diz se o pedido existe.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  requisicao: Request,
  {
    params,
  }: {
    params: Promise<{ contaId: string; pedidoId: string; chave: string }>;
  },
) {
  const { contaId, pedidoId, chave } = await params;
  const evento = await lerEventoDoPedido(
    contaId,
    pedidoId,
    chave,
    new URL(requisicao.url).origin,
  );
  if (!evento) return new Response(null, { status: 404 });

  return new Response(evento.ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="pedido-${evento.codigo}.ics"`,
      "cache-control": "no-store",
    },
  });
}
