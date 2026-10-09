"use client";

import { useEffect, useRef } from "react";
import type { Insumo } from "@/lib/types";

/**
 * O pedido da grade do "+" para a tela que abre um painel dentro dela
 * (`DECISOES.md#d241`): "Novo material" em `/insumos`, "Lançar no caixa" em
 * `/financeiro`. Em memória, e não na URL: `useSearchParams` pediria `Suspense`
 * nas duas telas, e o repasse funciona sem rede e com a tela já aberta.
 */
export type AcaoPedida = "novo-material" | "lancar" | "abrir-material";

let pendente: AcaoPedida | null = null;
/**
 * O material de "abrir-material", vindo do porquê de `/compras` (`#d303`). O
 * documento inteiro, e não o id: a tela de destino abre antes de a coleção
 * dela carregar, e o documento vivo toma o lugar dele quando chega.
 */
let material: Insumo | undefined;
const ouvintes = new Set<() => void>();

export function pedirAcao(acao: AcaoPedida, insumo?: Insumo) {
  pendente = acao;
  material = insumo;
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Consome o pedido ao montar e, com a tela já aberta, quando ele chega. */
export function useAcaoPedida(
  acao: AcaoPedida,
  executar: (insumo?: Insumo) => void,
) {
  const atual = useRef(executar);
  useEffect(() => {
    atual.current = executar;
  });

  useEffect(() => {
    const consumir = () => {
      if (pendente !== acao) return;
      pendente = null;
      atual.current(material);
    };
    consumir();
    ouvintes.add(consumir);
    return () => {
      ouvintes.delete(consumir);
    };
  }, [acao]);
}
