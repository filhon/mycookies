"use client";

import { useEffect, useState } from "react";
import {
  onSnapshot,
  type DocumentReference,
  type Query,
} from "firebase/firestore";

export interface EstadoColecao<T> {
  dados: T[];
  carregando: boolean;
  erro: Error | null;
  /** Os dados vieram do cache local, não do servidor. */
  doCache: boolean;
  /** Há escritas ainda não confirmadas pelo servidor. */
  pendente: boolean;
}

const COLECAO_VAZIA: EstadoColecao<never> = {
  dados: [],
  carregando: false,
  erro: null,
  doCache: false,
  pendente: false,
};

/**
 * Assina uma consulta com `includeMetadataChanges`, porque é o metadado que
 * conta a verdade offline: se veio do cache e se há escrita na fila. Sem isso a
 * interface mente sobre o estado de sincronização.
 *
 * Recebe a consulta pronta, não uma função que a cria: quem chama memoriza com
 * `useMemo` e uma lista de dependências literal, que é o que o compilador do
 * React consegue verificar. `null` desliga a assinatura.
 */
export function useColecao<T>(consulta: Query<T> | null): EstadoColecao<T> {
  const [estado, setEstado] = useState<EstadoColecao<T>>({
    dados: [],
    carregando: true,
    erro: null,
    doCache: false,
    pendente: false,
  });

  useEffect(() => {
    if (!consulta) return;

    return onSnapshot(
      consulta,
      { includeMetadataChanges: true },
      (snapshot) => {
        setEstado({
          dados: snapshot.docs.map((documento) => documento.data()),
          carregando: false,
          erro: null,
          doCache: snapshot.metadata.fromCache,
          pendente: snapshot.metadata.hasPendingWrites,
        });
      },
      (erro) => {
        setEstado((anterior) => ({ ...anterior, carregando: false, erro }));
      },
    );
  }, [consulta]);

  // Sem consulta não há o que carregar: o vazio é derivado, não um estado
  // gravado dentro do efeito.
  return consulta ? estado : (COLECAO_VAZIA as EstadoColecao<T>);
}

export interface EstadoDocumento<T> {
  dado: T | null;
  carregando: boolean;
  erro: Error | null;
  doCache: boolean;
  pendente: boolean;
}

const DOCUMENTO_VAZIO: EstadoDocumento<never> = {
  dado: null,
  carregando: false,
  erro: null,
  doCache: false,
  pendente: false,
};

export function useDocumento<T>(
  referencia: DocumentReference<T> | null,
): EstadoDocumento<T> {
  const [estado, setEstado] = useState<EstadoDocumento<T>>({
    dado: null,
    carregando: true,
    erro: null,
    doCache: false,
    pendente: false,
  });

  useEffect(() => {
    if (!referencia) return;

    return onSnapshot(
      referencia,
      { includeMetadataChanges: true },
      (snapshot) => {
        setEstado({
          dado: snapshot.exists() ? snapshot.data() : null,
          carregando: false,
          erro: null,
          doCache: snapshot.metadata.fromCache,
          pendente: snapshot.metadata.hasPendingWrites,
        });
      },
      (erro) => {
        setEstado((anterior) => ({ ...anterior, carregando: false, erro }));
      },
    );
  }, [referencia]);

  return referencia ? estado : (DOCUMENTO_VAZIO as EstadoDocumento<T>);
}
