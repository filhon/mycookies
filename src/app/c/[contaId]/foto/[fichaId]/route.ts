import { lerFotoDoCardapio } from "@/lib/server/cardapio";

/**
 * A foto do produto do cardápio público, por rota própria e não dentro da
 * página (spec 031, `DECISOES.md#d162`): o `data:` URL viajaria duas vezes no
 * HTML e sem `loading="lazy"`.
 *
 * O `?v=` é o `atualizadoEm` da ficha e só serve ao cache: foto trocada é URL
 * nova. Sem ele, ou com outro, a resposta é a mesma — não é senha.
 *
 * ponytail: lê a configuração e a ficha a cada foto não cacheada. Com a URL
 * imutável é uma leitura por versão por borda; se pesar, a foto vai para o
 * Storage e a URL da página continua a mesma.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ contaId: string; fichaId: string }> },
) {
  const { contaId, fichaId } = await params;
  const foto = await lerFotoDoCardapio(contaId, fichaId);
  if (!foto) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(foto.bytes), {
    headers: {
      "content-type": foto.tipo,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
