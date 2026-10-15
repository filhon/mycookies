"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Trocar de aba para o banco e voltar não deve custar duas leituras. */
const FOLGA_MS = 30_000;

/**
 * A página se lê de novo quando a cliente volta para a aba (spec 171): uma
 * leitura por volta, no máximo uma a cada 30 s. Nenhuma escuta, nenhum
 * intervalo: a regra continua sem nada público (`#d320`).
 */
export function AtualizaAoVoltar() {
  const router = useRouter();

  useEffect(() => {
    let ultima = Date.now();
    function aoVoltar() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultima < FOLGA_MS) return;
      ultima = Date.now();
      router.refresh();
    }
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [router]);

  return null;
}
