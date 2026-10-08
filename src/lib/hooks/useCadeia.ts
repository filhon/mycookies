"use client";

import { useEffect, useState } from "react";
import {
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { produtoDaCadeia } from "@/lib/domain/caixa";
import { competenciaAtual, competenciaVizinha } from "@/lib/domain/datas";
import {
  colFichas,
  docFicha,
  docInsumo,
  docResumoMensal,
} from "@/lib/firebase/colecoes";
import type { FichaTecnica, Insumo, ResumoMensal } from "@/lib/types";

export interface DadosDaCadeia {
  carregando: boolean;
  /** O agregado do mês que a cadeia lê: o corrente, ou o anterior quando o
      corrente ainda não vendeu produto. */
  resumo: ResumoMensal | null;
  ficha: FichaTecnica | null;
  /** O item da receita com maior `custoLinha`. */
  material: Insumo | null;
}

/** Sem rede e sem cache o `getDoc` lança: para a cadeia, é só "sem dado". */
async function ler<T>(referencia: DocumentReference<T>): Promise<T | null> {
  try {
    const snap = await getDoc(referencia);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/**
 * Os documentos da cadeia do dinheiro com os números dela (`#d296`): um
 * produto, o material que mais pesa nele e o agregado do mês. Leituras de
 * documento, uma de cada vez, e nenhuma assinatura de coleção: a página explica
 * o produto, e um número de minutos atrás continua o mesmo da tela.
 */
export function useCadeia(contaId: string): DadosDaCadeia {
  const [dados, setDados] = useState<DadosDaCadeia>({
    carregando: true,
    resumo: null,
    ficha: null,
    material: null,
  });

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const corrente = competenciaAtual();
      const atual = await ler(docResumoMensal(contaId, corrente));
      let resumo = atual;
      let candidatos = produtoDaCadeia(atual?.produtos);
      if (candidatos.length === 0) {
        const anterior = await ler(
          docResumoMensal(contaId, competenciaVizinha(corrente, -1)),
        );
        const doAnterior = produtoDaCadeia(anterior?.produtos);
        if (doAnterior.length > 0) {
          resumo = anterior;
          candidatos = doAnterior;
        }
      }

      let ficha: FichaTecnica | null = null;
      for (const id of candidatos.slice(0, 3)) {
        const lida = await ler(docFicha(contaId, id));
        if (lida && lida.tipo === "SIMPLES" && !lida.arquivado) {
          ficha = lida;
          break;
        }
      }
      if (!ficha) {
        // Duas igualdades: o Firestore junta os índices de campo único, sem
        // índice composto.
        ficha = await getDocs(
          query(
            colFichas(contaId),
            where("arquivado", "==", false),
            where("tipo", "==", "SIMPLES"),
            limit(1),
          ),
        ).then(
          (snap) => snap.docs[0]?.data() ?? null,
          () => null,
        );
      }

      const maisCaro = ficha?.itens.reduce<
        FichaTecnica["itens"][number] | null
      >(
        (maior, item) =>
          !maior || item.custoLinha > maior.custoLinha ? item : maior,
        null,
      );
      const material = maisCaro
        ? await ler(docInsumo(contaId, maisCaro.insumoId))
        : null;

      if (!cancelado) setDados({ carregando: false, resumo, ficha, material });
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [contaId]);

  return dados;
}
