"use client";

import { useEffect, useRef } from "react";

/**
 * O pedido da grade do "+" para a tela que abre um painel dentro dela
 * (`DECISOES.md#d241`): "Novo material" em `/insumos`, "Lançar no caixa" em
 * `/financeiro`. Em memória, e não na URL: `useSearchParams` pediria `Suspense`
 * nas duas telas, e o repasse funciona sem rede e com a tela já aberta.
 */
export type AcaoPedida = "novo-material" | "lancar";

let pendente: AcaoPedida | null = null;
const ouvintes = new Set<() => void>();

export function pedirAcao(acao: AcaoPedida) {
  pendente = acao;
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Consome o pedido ao montar e, com a tela já aberta, quando ele chega. */
export function useAcaoPedida(acao: AcaoPedida, executar: () => void) {
  const atual = useRef(executar);
  useEffect(() => {
    atual.current = executar;
  });

  useEffect(() => {
    const consumir = () => {
      if (pendente !== acao) return;
      pendente = null;
      atual.current();
    };
    consumir();
    ouvintes.add(consumir);
    return () => {
      ouvintes.delete(consumir);
    };
  }, [acao]);
}
