import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import { obterDb } from "./client";
import { caminhos } from "@/lib/types";
import type {
  Cliente,
  ConfiguracaoGeral,
  FichaTecnica,
  Insumo,
  ListaCompras,
  Meta,
  Pedido,
  ResumoGlobal,
  ResumoMensal,
  Transacao,
} from "@/lib/types";

/**
 * Injeta `id` na leitura e o remove na escrita.
 * O id do documento é do Firestore; duplicá-lo dentro do doc é desperdício de
 * armazenamento e uma segunda fonte de verdade esperando para divergir.
 */
function conversor<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(dado) {
      const copia: Record<string, unknown> = { ...dado };
      delete copia.id;
      return copia;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions,
    ): T {
      return { id: snapshot.id, ...snapshot.data(options) } as T;
    },
  };
}

function col<T extends { id: string }>(
  caminho: string,
): CollectionReference<T> {
  return collection(obterDb(), caminho).withConverter(conversor<T>());
}

export const colInsumos = (uid: string) => col<Insumo>(caminhos.insumos(uid));
export const colFichas = (uid: string) =>
  col<FichaTecnica>(caminhos.fichas(uid));
export const colClientes = (uid: string) =>
  col<Cliente>(caminhos.clientes(uid));
export const colPedidos = (uid: string) => col<Pedido>(caminhos.pedidos(uid));
export const colListasCompra = (uid: string) =>
  col<ListaCompras>(caminhos.listasCompra(uid));
export const colTransacoes = (uid: string) =>
  col<Transacao>(caminhos.transacoes(uid));
export const colMetas = (uid: string) => col<Meta>(caminhos.metas(uid));

export const docInsumo = (uid: string, id: string): DocumentReference<Insumo> =>
  doc(colInsumos(uid), id);
export const docFicha = (uid: string, id: string) => doc(colFichas(uid), id);
export const docPedido = (uid: string, id: string) => doc(colPedidos(uid), id);

export const docConfiguracao = (uid: string) =>
  doc(obterDb(), caminhos.configuracaoGeral(uid)).withConverter(
    conversor<ConfiguracaoGeral>(),
  );

export const docResumoMensal = (uid: string, competencia: string) =>
  doc(obterDb(), caminhos.resumoMensal(uid, competencia)).withConverter(
    conversor<ResumoMensal>(),
  );

export const docResumoGlobal = (uid: string) =>
  doc(obterDb(), caminhos.resumoGlobal(uid)).withConverter(
    conversor<ResumoGlobal>(),
  );
