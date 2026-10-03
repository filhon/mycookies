"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Botao } from "./Botao";
import type { VarianteBotao } from "./estilosBotao";

/**
 * Copia um texto para a área de transferência, com o "Copiado" vivo por 2 s
 * (spec 080, o Pix copia e cola). Sem permissão de área de transferência, o
 * texto aparece embaixo, selecionável num toque.
 */
export function BotaoCopiar({
  texto,
  rotulo,
  variante = "secundaria",
}: {
  texto: string;
  rotulo: string;
  variante?: VarianteBotao;
}) {
  const [copiado, setCopiado] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const relogio = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(relogio);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setMostrar(true);
    }
  }

  return (
    <div className="space-y-2">
      <Botao
        tamanho="sm"
        variante={variante}
        onClick={() => void copiar()}
        iconeInicial={
          copiado ? (
            <Check aria-hidden className="size-4" strokeWidth={2} />
          ) : (
            <Copy aria-hidden className="size-4" strokeWidth={1.75} />
          )
        }
      >
        <span aria-live="polite">{copiado ? "Copiado" : rotulo}</span>
      </Botao>
      {mostrar && (
        <p className="select-all break-all rounded-md bg-sunken px-4 py-3 text-label text-ink">
          {texto}
        </p>
      )}
    </div>
  );
}
