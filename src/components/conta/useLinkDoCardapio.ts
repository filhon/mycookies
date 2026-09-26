"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth, useContaId } from "@/providers/AuthProvider";

/** O endereço e o `share` não mudam enquanto a tela está aberta. */
const SEM_MUDANCA = () => () => {};

/**
 * O endereço do cardápio e as duas formas de mandá-lo: a folha do sistema
 * (`navigator.share`) e a área de transferência, com o "Copiado" vivo por 2 s.
 * Usado pelo painel "Seu cardápio" e pela linha da tela Hoje (spec 046).
 */
export function useLinkDoCardapio() {
  const contaId = useContaId();
  const { conta } = useAuth();
  // Só no navegador: o servidor não sabe o endereço nem se há `share`.
  const origem = useSyncExternalStore(
    SEM_MUDANCA,
    () => window.location.origin,
    () => "",
  );
  const podeCompartilhar = useSyncExternalStore(
    SEM_MUDANCA,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const relogio = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(relogio);
  }, [copiado]);

  const endereco = `${origem}/c/${contaId}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
    } catch {
      // Sem permissão de área de transferência: o endereço está na tela,
      // selecionável num toque.
    }
  }

  function compartilhar() {
    // Fechar a folha do sistema sem escolher rejeita a promessa; não é erro.
    navigator.share({ title: conta?.nome, url: endereco }).catch(() => {});
  }

  return { endereco, podeCompartilhar, copiado, copiar, compartilhar };
}
