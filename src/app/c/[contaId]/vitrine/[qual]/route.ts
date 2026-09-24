import { lerImagemDaVitrine } from "@/lib/server/cardapio";

/**
 * A capa e o logo do cardápio público (spec 031, sessão F, `DECISOES.md#d166`),
 * pelo mesmo caminho da foto do produto (`#d162`): fora do HTML, com o `?v=`
 * do `atualizadoEm` da vitrine como chave de cache.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ contaId: string; qual: string }> },
) {
  const { contaId, qual } = await params;
  if (qual !== "capa" && qual !== "logo") {
    return new Response(null, { status: 404 });
  }
  const imagem = await lerImagemDaVitrine(contaId, qual);
  if (!imagem) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(imagem.bytes), {
    headers: {
      "content-type": imagem.tipo,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
