"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** `GET /api/beta` (spec 182). */
export interface BetaNoAparelho {
  fase: "BETA" | "PUBLICO";
  vagas: number;
  restam: number;
}

const CHAVE = "rende:beta";

const semAssinatura = () => () => {};

function guardado(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function comoBeta(texto: string | null): BetaNoAparelho | null {
  try {
    const lido = JSON.parse(texto ?? "null") as Partial<BetaNoAparelho> | null;
    return lido?.fase === "BETA" || lido?.fase === "PUBLICO"
      ? {
          fase: lido.fase,
          vagas: Number(lido.vagas) || 0,
          restam: Number(lido.restam) || 0,
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * A fase e as vagas do beta para as telas do app (spec 183): o último valor
 * do aparelho abre na hora, e offline; a resposta da rota o troca e o guarda.
 * `null` enquanto nunca houve resposta.
 */
export function useBeta(): BetaNoAparelho | null {
  const doAparelho = useSyncExternalStore(semAssinatura, guardado, () => null);
  const [daRede, setDaRede] = useState<BetaNoAparelho | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/beta")
      .then((resposta) => (resposta.ok ? resposta.text() : null))
      .catch(() => null)
      .then((texto) => {
        const lido = comoBeta(texto);
        if (!vivo || !lido) return;
        setDaRede(lido);
        try {
          localStorage.setItem(CHAVE, JSON.stringify(lido));
        } catch {
          // Sem armazenamento, a tela vale até fechar.
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  return daRede ?? comoBeta(doAparelho);
}
