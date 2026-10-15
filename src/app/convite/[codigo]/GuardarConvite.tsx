"use client";

import { useEffect } from "react";
import { CHAVE_DO_CONVITE } from "@/lib/domain/cadastro";

/**
 * O código vai para o aparelho já na página do convite (spec 183): se ela
 * fechar e voltar pelo `/cadastro` sem o link, o convite continua lá.
 */
export function GuardarConvite({ codigo }: { codigo: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_DO_CONVITE, codigo);
    } catch {
      // Sem armazenamento, o botão ainda leva o código no endereço.
    }
  }, [codigo]);
  return null;
}
