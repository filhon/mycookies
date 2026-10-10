"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";

/**
 * "Mandar o cardápio" (spec 114, `DECISOES.md#d317`): a cliente que gostou manda
 * à amiga. A folha do sistema quando há `share`; senão, copia o link e diz
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
        aria-label={copiado ? undefined : "Mandar o cardápio"}
        className={classesBotao({ tamanho: "sm" })}
      >
        <Share2 aria-hidden className="size-4" strokeWidth={1.75} />
        {copiado ? "Link copiado" : "Mandar"}
      </button>
      <span role="status" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
    </>
  );
}
