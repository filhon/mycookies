"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";

/**
 * "Compartilhar" (spec 114, `DECISOES.md#d317`; o rótulo é do `#d326`): a
 * cliente que gostou manda à amiga. A folha do sistema quando há `share`; senão, copia o link e diz
 * "Link copiado" por 2 s. Cancelar a folha não diz nada.
 */
export function MandarOCardapio({ nome }: { nome: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const relogio = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(relogio);
  }, [copiado]);

  async function mandar() {
    // Sem `?` nem `#`: o link é o do cardápio, não o do que ela abriu.
    const url = location.origin + location.pathname;
    if (typeof navigator.share === "function") {
      navigator.share({ title: nome, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      // Sem área de transferência: a barra de endereço continua lá.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={mandar}
        // Copiado, o nome é o que está escrito (o rótulo contém o visível).
        aria-label={copiado ? undefined : "Compartilhar o cardápio"}
        className={classesBotao({ tamanho: "sm" })}
      >
        {/* Abaixo de `sm`, só o ícone: com o texto, os três botões do topo
            quebram a fileira a 360 px. Copiado, o ícone vira o visto (`#d326`). */}
        {copiado ? (
          <Check aria-hidden className="size-4" strokeWidth={2} />
        ) : (
          <Share2 aria-hidden className="size-4" strokeWidth={1.75} />
        )}
        <span className="sr-only sm:not-sr-only">
          {copiado ? "Link copiado" : "Compartilhar"}
        </span>
      </button>
      <span role="status" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
    </>
  );
}
