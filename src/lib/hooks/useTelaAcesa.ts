"use client";

import { useEffect } from "react";

/**
 * A tela não apaga enquanto `ativo` (`DECISOES.md#d302`).
 *
 * O navegador solta a trava sozinho quando a aba some, então ela é pedida de
 * novo a cada volta. Sem suporte, ou com o pedido recusado (bateria fraca), não
 * faz nada e não diz nada: a tela apagar é o comportamento de sempre.
 */
export function useTelaAcesa(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;

    let trava: WakeLockSentinel | null = null;
    let saiu = false;

    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((nova) => {
          if (saiu) void nova.release();
          else trava = nova;
        })
        .catch(() => {});
    };

    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      saiu = true;
      document.removeEventListener("visibilitychange", pedir);
      void trava?.release().catch(() => {});
    };
  }, [ativo]);
}
