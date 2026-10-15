import { desenharPrevia, TAMANHO_DA_PREVIA } from "@/app/previa/previa";
import { lerOConvite, textoDaPrevia } from "./dados";

/**
 * A prévia do convite no WhatsApp (spec 183, `#d183`): o nome de quem convida,
 * que é o que faz o link não parecer propaganda. Lida a cada requisição, e não
 * no build. Convite que não vale: a genérica, sem nome. O código não aparece.
 */
export const dynamic = "force-dynamic";
export const alt = "Rende. Beta fechado, por convite.";
export const size = TAMANHO_DA_PREVIA;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { linhaDeCima, titulo } = textoDaPrevia(
    await lerOConvite((await params).codigo),
  );
  return desenharPrevia({ linhaDeCima, frase: titulo });
}
