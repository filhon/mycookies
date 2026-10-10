"use client";

import { useEffect } from "react";
import { CHAVE_DA_ORIGEM } from "@/lib/domain/cadastro";

/**
 * `/conheca?de=cardapio` (spec 114, `DECISOES.md#d317`): quem chegou pelo
 * rodapé de um cardápio deixa a marca no aparelho, e o cadastro manda
 * `origem: "cardapio"`. No cliente para a página continuar estática.
 */
export function OrigemDoLink() {
  useEffect(() => {
    if (new URLSearchParams(location.search).get("de") !== "cardapio") return;
    try {
      localStorage.setItem(CHAVE_DA_ORIGEM, "cardapio");
    } catch {
      // Sem armazenamento, sem medida.
    }
  }, []);
  return null;
}
