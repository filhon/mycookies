"use client";

import { useMemo } from "react";
import { limit, query, where } from "firebase/firestore";
import { competenciaAtual } from "@/lib/domain/datas";
import {
  colClientes,
  colFichas,
  colInsumos,
  colTransacoes,
  docMeta,
} from "@/lib/firebase/colecoes";
import {
  useColecao,
  useDocumento,
  type EstadoColecao,
} from "@/lib/hooks/useColecao";
import type {
  Cliente,
  FichaTecnica,
  Insumo,
  Meta,
  Transacao,
} from "@/lib/types";

/** As telas de "O que mais tem aqui" que têm um fato. A lista de compras não tem. */
export type TelaComFato = "nota" | "despensa" | "pronto" | "clientes";

export interface TelasAbertas {
  /**
   * Se ela já usa cada tela. `null` enquanto alguma resposta não merece
   * confiança: carregando, com erro, ou vazia vinda só do cache (`#d299`).
   */
  fatos: Record<TelaComFato, boolean> | null;
  /** Existe a meta do mês corrente. */
  temMeta: boolean;
}

/**
 * Vazio só é "não usa" quando o servidor disse: o cache de um aparelho sem
 * rede também responde vazio, e um "ainda não abriu" inventado é pior do que
 * nenhum (`#d69`). Um documento achado vale de onde vier.
 */
function fato(estado: EstadoColecao<unknown>): boolean | null {
  if (estado.dados.length > 0) return true;
  return estado.carregando || estado.doCache || estado.erro ? null : false;
}

/**
 * Quais das telas de fora do menu ela já usa (`#d299`), cada uma perguntada à
 * coleção que tem a resposta, com `limit(1)`, como o `#d67`. Um campo só por
 * consulta: o `!= null` e a igualdade andam no índice de campo único, sem
 * índice composto. A meta é lida como o Caixa lê, pelo id do mês.
 *
 * Só `/comecar` chama: as assinaturas morrem com a página.
 */
export function useTelasAbertas(contaId: string): TelasAbertas {
  const consultaNota = useMemo(
    () =>
      query(colTransacoes(contaId), where("notaChave", "!=", null), limit(1)),
    [contaId],
  );
  const consultaDespensa = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("estoqueContadoEmISO", "!=", null),
        limit(1),
      ),
    [contaId],
  );
  const consultaPronto = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("estoqueProntoContadoEmISO", "!=", null),
        limit(1),
      ),
    [contaId],
  );
  const consultaClientes = useMemo(
    () =>
      query(colClientes(contaId), where("arquivado", "==", false), limit(1)),
    [contaId],
  );
  const referenciaMeta = useMemo(
    () => docMeta(contaId, competenciaAtual()),
    [contaId],
  );

  const nota = fato(useColecao<Transacao>(consultaNota));
  const despensa = fato(useColecao<Insumo>(consultaDespensa));
  const pronto = fato(useColecao<FichaTecnica>(consultaPronto));
  const clientes = fato(useColecao<Cliente>(consultaClientes));
  const meta = useDocumento<Meta>(referenciaMeta);

  const conhecidos =
    nota !== null &&
    despensa !== null &&
    pronto !== null &&
    clientes !== null &&
    !meta.carregando;

  return {
    fatos: conhecidos ? { nota, despensa, pronto, clientes } : null,
    temMeta: meta.dado !== null,
  };
}
