"use client";

import { useMemo, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { parcelasDoResumo } from "@/lib/domain/caixa";
import { competenciaAtual, rotuloMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import { colFichas, docResumoMensal } from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type { FichaTecnica, ResumoMensal, ResumoProduto } from "@/lib/types";

/** Uma linha do que rendeu: o número à parte, para a tela pôr em `num` 600. */
export interface ParteDoQueRendeu {
  numero: string;
  resto: string;
}

/**
 * O que o Rende já fez pela conta no mês (`#d218`), para a faixa da Hoje e
 * para `/assinatura` (spec 161). As mesmas duas leituras de `CartaoDoMes` e
 * `CartaoNoVermelhoHoje`: o Firestore divide o alvo, e nenhuma consulta nova
 * sai daqui. `produtos` é o que o `#d219` precisa para achar o mais vendido.
 * Sem conta, nada lido e nada contado.
 */
export function useOQueRendeu(contaId: string | null): {
  partes: ParteDoQueRendeu[];
  produtos: Record<string, ResumoProduto>;
} {
  const [competencia] = useState(() => competenciaAtual(new Date()));

  const refResumo = useMemo(
    () => (contaId ? docResumoMensal(contaId, competencia) : null),
    [contaId, competencia],
  );
  const consultaFichas = useMemo(
    () =>
      contaId
        ? query(
            colFichas(contaId),
            where("arquivado", "==", false),
            orderBy("nomeBusca"),
          )
        : null,
    [contaId],
  );
  const resumo = useDocumento<ResumoMensal>(refResumo);
  const fichas = useColecao<FichaTecnica>(consultaFichas);

  const { entradas, produtos } = parcelasDoResumo(resumo.dado);
  const comPreco = fichas.dados.filter(
    (ficha) => ficha.precificacao.precoVenda > 0,
  ).length;

  // Nada contado, nada inventado.
  const partes: ParteDoQueRendeu[] = [];
  if (comPreco > 0) {
    partes.push({
      numero: String(comPreco),
      resto: comPreco === 1 ? "produto com preço" : "produtos com preço",
    });
  }
  if (entradas > 0) {
    partes.push({
      numero: formatarMoeda(entradas),
      resto: `em vendas em ${rotuloMes(competencia)}`,
    });
  }

  return { partes, produtos };
}
