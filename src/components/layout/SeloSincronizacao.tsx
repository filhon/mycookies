"use client";

import { useEffect, useState } from "react";
import { waitForPendingWrites } from "firebase/firestore";
import { Check, CloudOff, RefreshCw } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { obterDb } from "@/lib/firebase/client";
import { useConexao } from "@/lib/hooks/useDispositivo";

/** O que o selo diz depois que a rede volta. */
type Volta = null | "enviando" | "enviado";

/**
 * Offline é o estado normal desta usuária, não uma falha. O selo informa, em
 * tom de atenção e nunca de erro, que o dado está seguro no aparelho.
 *
 * Quando a rede volta, ele espera **todas** as escritas do aparelho
 * (`waitForPendingWrites`), e não só as da coleção da tela, e diz "Tudo
 * enviado" por 4 segundos (`DECISOES.md#d234`).
 *
 * ponytail: a transição mora no componente. Trocar de tela no meio da espera
 * monta um selo que já nasce online e não diz "Tudo enviado"; guardar a volta
 * fora dele só se o roteiro mostrar que isso engana.
 */
export function SeloSincronizacao({ pendente }: { pendente: boolean }) {
  const online = useConexao();
  const [onlineAntes, setOnlineAntes] = useState(online);
  const [volta, setVolta] = useState<Volta>(null);

  // Ajuste durante a renderização, e não num efeito: a volta nasce no mesmo
  // quadro em que `online` muda.
  if (online !== onlineAntes) {
    setOnlineAntes(online);
    setVolta(online ? "enviando" : null);
  }

  useEffect(() => {
    if (volta !== "enviando") return;
    let vivo = true;
    waitForPendingWrites(obterDb()).then(
      () => vivo && setVolta("enviado"),
      () => vivo && setVolta(null),
    );
    return () => {
      vivo = false;
    };
  }, [volta]);

  useEffect(() => {
    if (volta !== "enviado") return;
    const relogio = setTimeout(() => setVolta(null), 4000);
    return () => clearTimeout(relogio);
  }, [volta]);

  if (!online) {
    return (
      <Selo tom="atencao" icone={<CloudOff aria-hidden className="size-3.5" />}>
        Salvo no aparelho
      </Selo>
    );
  }

  if (pendente || volta === "enviando") {
    return (
      <Selo
        tom="info"
        icone={<RefreshCw aria-hidden className="size-3.5 animate-spin" />}
      >
        Enviando
      </Selo>
    );
  }

  if (volta === "enviado") {
    return (
      <Selo tom="positivo" icone={<Check aria-hidden className="size-3.5" />}>
        Tudo enviado
      </Selo>
    );
  }

  return null;
}
