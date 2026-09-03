"use client";

import { useMemo } from "react";
import { limit, query, where } from "firebase/firestore";
import {
  passosDoComeco,
  progressoDoComeco,
  proximoPasso,
  type PassoDoComeco,
  type ProgressoDoComeco,
} from "@/lib/domain/onboarding";
import {
  colFichas,
  colInsumos,
  colPedidos,
  colTransacoes,
  docConfiguracao,
} from "@/lib/firebase/colecoes";
import { useColecao, useDocumento } from "@/lib/hooks/useColecao";
import type {
  ConfiguracaoGeral,
  FichaTecnica,
  Insumo,
  Pedido,
  Transacao,
} from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

export interface EstadoComeco {
  passos: PassoDoComeco[];
  progresso: ProgressoDoComeco;
  proximo: PassoDoComeco | null;
  /** true enquanto qualquer das cinco perguntas não respondeu. */
  carregando: boolean;
  /** `primeirosPassosEm` já gravado: não há caminho a mostrar. */
  encerrado: boolean;
}

/**
 * Onde a conta está no caminho do começo.
 *
 * **Cinco perguntas, cada uma para quem tem a resposta** (`DECISOES.md#d67`): o
 * documento da configuração pelo id, e quatro consultas de `arquivado == false`
 * com `limit(1)`. Nenhuma delas devolve mais de um documento, nenhuma precisa de
 * índice composto novo — campo único o Firestore indexa sozinho — e nenhuma
 * escreve.
 *
 * **As cinco morrem no dia em que o caminho termina.** `useColecao(null)` e
 * `useDocumento(null)` não abrem assinatura nenhuma, e é assim que uma conta
 * concluída não paga por este gancho — nem no primeiro render: as consultas só
 * nascem depois que o documento da conta chega, porque perguntar antes de saber
 * se o caminho acabou seria abrir as cinco justamente na conta que não as quer.
 *
 * Quando `encerrado` é verdadeiro, `passos` carrega a ordem dos cinco com os
 * estados que se deduzem de "não perguntei nada" — quem os desenha nesse caso é
 * `/comecar`, que mostra os cinco como mapa e não como estado. O cartão da tela
 * Hoje não renderiza nada.
 */
export function useComeco(): EstadoComeco {
  const { conta, contaId } = useAuth();

  const encerrado = conta?.primeirosPassosEm != null;

  // Só depois de o documento da conta chegar. `conta` nulo é "ainda não sei",
  // e não "não terminou".
  const ativo = contaId !== null && conta !== null && !encerrado;
  const alvo = ativo ? contaId : null;

  const refConfiguracao = useMemo(
    () => (alvo ? docConfiguracao(alvo) : null),
    [alvo],
  );
  const consultaInsumos = useMemo(
    () =>
      alvo
        ? query(colInsumos(alvo), where("arquivado", "==", false), limit(1))
        : null,
    [alvo],
  );
  const consultaFichas = useMemo(
    () =>
      alvo
        ? query(colFichas(alvo), where("arquivado", "==", false), limit(1))
        : null,
    [alvo],
  );
  const consultaPedidos = useMemo(
    () =>
      alvo
        ? query(colPedidos(alvo), where("arquivado", "==", false), limit(1))
        : null,
    [alvo],
  );
  const consultaTransacoes = useMemo(
    () =>
      alvo
        ? query(colTransacoes(alvo), where("arquivado", "==", false), limit(1))
        : null,
    [alvo],
  );

  const configuracao = useDocumento<ConfiguracaoGeral>(refConfiguracao);
  const insumos = useColecao<Insumo>(consultaInsumos);
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const pedidos = useColecao<Pedido>(consultaPedidos);
  const transacoes = useColecao<Transacao>(consultaTransacoes);

  const passos = useMemo(
    () =>
      passosDoComeco({
        temConfiguracao: configuracao.dado !== null,
        temInsumo: insumos.dados.length > 0,
        temFicha: fichas.dados.length > 0,
        temPedido: pedidos.dados.length > 0,
        temLancamento: transacoes.dados.length > 0,
      }),
    [
      configuracao.dado,
      insumos.dados.length,
      fichas.dados.length,
      pedidos.dados.length,
      transacoes.dados.length,
    ],
  );

  const carregando = encerrado
    ? false
    : !ativo ||
      configuracao.carregando ||
      insumos.carregando ||
      fichas.carregando ||
      pedidos.carregando ||
      transacoes.carregando;

  return {
    passos,
    progresso: progressoDoComeco(passos),
    proximo: proximoPasso(passos),
    carregando,
    encerrado,
  };
}
