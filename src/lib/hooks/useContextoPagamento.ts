"use client";

import { useMemo } from "react";
import { parcelasDoResumo } from "@/lib/domain/caixa";
import { docMeta, docResumoMensal } from "@/lib/firebase/colecoes";
import type { ContextoPagamento } from "@/lib/firebase/mutations/pedidos";
import { useDocumento } from "@/lib/hooks/useColecao";
import type { CompetenciaMensal, Meta, ResumoMensal } from "@/lib/types";

/**
 * O que marcar pago e desfazer precisam saber do mês do pagamento.
 *
 * A tela assina os dois documentos para que a mutação não leia nada: o
 * espelho da meta e o ticket médio são escritos por valor, e lançar precisa
 * funcionar sem rede (`DECISOES.md#d29`). Usado pelo editor e pela ficha do
 * pedido (`#d250`).
 *
 * `competencia` nula não assina nada, e o contexto volta nulo: é o caso da
 * ajudante, para quem a regra nega os dois documentos e o `permission-denied`
 * nem nasce.
 */
export function useContextoPagamento(
  contaId: string,
  competencia: CompetenciaMensal | null,
): {
  contexto: ContextoPagamento | null;
  /** O agregado do mês ainda não chegou: pagar agora torceria. */
  carregando: boolean;
} {
  const referenciaResumo = useMemo(
    () => (competencia ? docResumoMensal(contaId, competencia) : null),
    [contaId, competencia],
  );
  const referenciaMeta = useMemo(
    () => (competencia ? docMeta(contaId, competencia) : null),
    [contaId, competencia],
  );

  const resumo = useDocumento<ResumoMensal>(referenciaResumo);
  const meta = useDocumento<Meta>(referenciaMeta);

  if (!competencia) return { contexto: null, carregando: false };

  const parcelas = parcelasDoResumo(resumo.dado);
  return {
    contexto: {
      competencia,
      meta: meta.dado,
      entradas: parcelas.entradas,
      receitaPedidos: parcelas.receitaPedidos,
      qtdPedidos: parcelas.qtdPedidos,
    },
    carregando: resumo.carregando,
  };
}
