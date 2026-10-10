"use client";

import { useState, useSyncExternalStore } from "react";
import { caminhoDoAcompanhamento } from "@/lib/domain/acompanhamento";
import { paraSituar, permite, situacaoDaConta } from "@/lib/domain/assinatura";
import {
  garantirChavePublica,
  novaChavePublica,
} from "@/lib/firebase/mutations/pedidos";
import type { Pedido } from "@/lib/types";
import { useAuth, useContaId } from "@/providers/AuthProvider";

const SEM_MUDANCA = () => () => {};
const NADA = () => {};

/**
 * O link do pedido que a cliente acompanha, para o resumo do WhatsApp (spec
 * 117, `#d320`), e o `garantir` que o toque em "Mandar" chama. Pedido sem
 * chave (de antes da spec) leva no link uma chave sorteada aqui, que só é
 * gravada no toque, sem rede inclusive. Sem o cardápio no pacote, sem link.
 */
export function useLinkDoAcompanhamento(
  pedido: Pick<Pedido, "id" | "chavePublica"> | null | undefined,
): { link?: string; garantir: () => void } {
  const contaId = useContaId();
  const { conta } = useAuth();
  const origem = useSyncExternalStore(
    SEM_MUDANCA,
    () => window.location.origin,
    () => "",
  );
  const [provisoria] = useState(novaChavePublica);

  if (!pedido || !conta || !origem || conta.status === "ENCERRADA") {
    return { garantir: NADA };
  }
  // `new Date().getTime()`: o compilador do React recusa `Date.now()` no corpo.
  const situacao = situacaoDaConta(paraSituar(conta), new Date().getTime());
  if (!permite(situacao, "cardapio")) return { garantir: NADA };

  const chave = pedido.chavePublica ?? provisoria;
  return {
    link:
      origem +
      caminhoDoAcompanhamento(conta.apelido ?? contaId, pedido.id, chave),
    garantir: () => garantirChavePublica(contaId, pedido, chave),
  };
}
