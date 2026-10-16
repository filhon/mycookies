"use client";

import { useEffect } from "react";
import { CHAVE_DA_ORIGEM } from "@/lib/domain/cadastro";

/**
 * `/conheca?de=cardapio` (spec 114, `DECISOES.md#d317`) e
 * `/cadastro?de=espera` (spec 186): quem chegou pelo rodapé de um cardápio ou
 * pelo e-mail do lançamento deixa a marca no aparelho, e o cadastro manda a
 * `origem`. No cliente para a página continuar estática.
 */
export function OrigemDoLink() {
  useEffect(() => {
    const de = new URLSearchParams(location.search).get("de");
    if (de !== "cardapio" && de !== "espera") return;
    try {
      localStorage.setItem(CHAVE_DA_ORIGEM, de);
    } catch {
      // Sem armazenamento, sem medida.
    }
  }, []);
  return null;
}
