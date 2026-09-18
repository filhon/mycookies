"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { useConexao } from "@/lib/hooks/useDispositivo";

/**
 * Offline é o estado normal desta usuária, não uma falha. O selo informa, em
 * tom de atenção e nunca de erro, que o dado está seguro no aparelho.
 */
export function SeloSincronizacao({ pendente }: { pendente: boolean }) {
  const online = useConexao();

  if (!online) {
    return (
      <Selo tom="atencao" icone={<CloudOff aria-hidden className="size-3.5" />}>
        Salvo no aparelho
      </Selo>
    );
  }

  if (pendente) {
    return (
      <Selo
        tom="info"
        icone={<RefreshCw aria-hidden className="size-3.5 animate-spin" />}
      >
        Enviando
      </Selo>
    );
  }

  return null;
}
