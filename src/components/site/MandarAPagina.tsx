"use client";

import { Send } from "lucide-react";
import { classesBotao, type VarianteBotao } from "@/components/ui/estilosBotao";
import { linkDoWhatsApp } from "@/lib/domain/whatsapp";

/**
 * "Mandar pelo WhatsApp" (spec 177, `DECISOES.md#d395`): a página que se passa
 * ao grupo de confeiteiras. É um link para o `wa.me` sem número, e funciona
 * sem JavaScript; com ele, a folha do aparelho quando há `share`, como no
 * `MandarOCardapio`. Desistir da folha não diz nada.
 */
export function MandarAPagina({
  titulo,
  texto,
  url,
  rotulo = "Mandar pelo WhatsApp",
  variante,
}: {
  titulo: string;
  /** A frase antes do endereço. O endereço vai separado ao `share`, que o junta sozinho. */
  texto: string;
  /** Absoluto, sem `#`. */
  url: string;
  rotulo?: string;
  /** Secundário por padrão; o convite da 183 o faz primário na primeira linha. */
  variante?: VarianteBotao;
}) {
  function mandar(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof navigator.share !== "function") return;
    e.preventDefault();
    navigator.share({ title: titulo, text: texto, url }).catch(() => {});
  }

  return (
    <a
      href={linkDoWhatsApp(undefined, `${texto} ${url}`)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={mandar}
      className={classesBotao({ variante, className: "w-full sm:w-auto" })}
    >
      <Send aria-hidden className="size-5" strokeWidth={1.75} />
      {rotulo}
    </a>
  );
}
