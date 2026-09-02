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
  Conta,
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

/** Documento raiz da conta. Tudo mais é subcoleção dele. */
export const docConta = (contaId: string): DocumentReference<Conta> =>
  doc(obterDb(), caminhos.conta(contaId)).withConverter(conversor<Conta>());

export const colInsumos = (contaId: string) =>
  col<Insumo>(caminhos.insumos(contaId));
export const colFichas = (contaId: string) =>
  col<FichaTecnica>(caminhos.fichas(contaId));
export const colClientes = (contaId: string) =>
  col<Cliente>(caminhos.clientes(contaId));
export const colPedidos = (contaId: string) =>
  col<Pedido>(caminhos.pedidos(contaId));
export const colListasCompra = (contaId: string) =>
  col<ListaCompras>(caminhos.listasCompra(contaId));
export const colTransacoes = (contaId: string) =>
  col<Transacao>(caminhos.transacoes(contaId));
export const colMetas = (contaId: string) => col<Meta>(caminhos.metas(contaId));

export const docInsumo = (
  contaId: string,
  id: string,
): DocumentReference<Insumo> => doc(colInsumos(contaId), id);
export const docFicha = (contaId: string, id: string) =>
  doc(colFichas(contaId), id);
export const docPedido = (contaId: string, id: string) =>
  doc(colPedidos(contaId), id);
export const docCliente = (contaId: string, id: string) =>
  doc(colClientes(contaId), id);
export const docListaCompras = (contaId: string, id: string) =>
  doc(colListasCompra(contaId), id);

/**
 * A meta de um mês, com a competência como id.
 *
 * Um mês tem uma meta só: o id ser `'YYYY-MM'` torna isso estrutural em vez de
 * combinado, dispensa consulta e índice para achar a meta da vez, e faz o
 * documento cair no mesmo endereço do agregado que ele espelha.
 */
export const docMeta = (contaId: string, competencia: string) =>
  doc(colMetas(contaId), competencia);

export const docConfiguracao = (contaId: string) =>
  doc(obterDb(), caminhos.configuracaoGeral(contaId)).withConverter(
    conversor<ConfiguracaoGeral>(),
  );

export const docResumoMensal = (contaId: string, competencia: string) =>
  doc(obterDb(), caminhos.resumoMensal(contaId, competencia)).withConverter(
    conversor<ResumoMensal>(),
  );

export const docResumoGlobal = (contaId: string) =>
  doc(obterDb(), caminhos.resumoGlobal(contaId)).withConverter(
    conversor<ResumoGlobal>(),
  );
