"use client";

import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { diaVizinho } from "@/lib/domain/datas";
import { entraNaLista, HORIZONTE_MAXIMO } from "@/lib/domain/listaCompras";
import {
  consumoDesdeAContagem,
  prometidoParaPedidos,
  reservadoNoPronto,
} from "@/lib/domain/producao";
import { colInsumos, colPedidos } from "@/lib/firebase/colecoes";
import { consultaFornadas } from "@/lib/firebase/mutations/fornadas";
import { useColecao } from "./useColecao";
import type {
  DataISO,
  FichaTecnica,
  Fornada,
  Insumo,
  Pedido,
} from "@/lib/types";

/**
 * As três assinaturas de quem pergunta à despensa: os insumos vivos, as
 * fornadas recentes e os pedidos do horizonte. `/compras` monta a lista com
 * elas; `/fichas` e o editor de pedido respondem quantas fornadas dá.
 *
 * Um hook só porque as três telas perguntam a mesma coisa, e três cópias das
 * mesmas consultas seriam três lugares para o recorte divergir.
 */
export function useDespensaParaProduzir(contaId: string, hoje: DataISO) {
  const consultaPedidos = useMemo(
    () =>
      query(
        colPedidos(contaId),
        where("arquivado", "==", false),
        where("dataEntregaISO", ">=", hoje),
        where("dataEntregaISO", "<=", diaVizinho(hoje, HORIZONTE_MAXIMO)),
        orderBy("dataEntregaISO"),
      ),
    [contaId, hoje],
  );

  const consultaInsumos = useMemo(
    () =>
      query(
        colInsumos(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const consultaProducao = useMemo(
    () => consultaFornadas(contaId, hoje),
    [contaId, hoje],
  );

  const pedidos = useColecao<Pedido>(consultaPedidos);
  const insumos = useColecao<Insumo>(consultaInsumos);
  const fornadas = useColecao<Fornada>(consultaProducao);

  return {
    pedidos,
    insumos,
    fornadas,
    carregando: pedidos.carregando || insumos.carregando || fornadas.carregando,
  };
}

/**
 * O que `capacidadeDaFicha` precisa além da ficha: o que a massa já levou da
 * despensa, o que os pedidos abertos ainda vão levar, e o que dos prontos já
 * é deles (13D). O pedido que está sendo perguntado fica de fora dos dois
 * últimos, senão ele descontaria a si mesmo.
 */
export function contextoDaCapacidade(
  pedidos: Pedido[],
  fichas: FichaTecnica[],
  insumos: Insumo[],
  fornadas: Fornada[],
  hoje: DataISO,
  excluirPedidoId?: string,
) {
  const limite = diaVizinho(hoje, HORIZONTE_MAXIMO);
  const abertos = pedidos.filter(
    (pedido) =>
      pedido.id !== excluirPedidoId && entraNaLista(pedido, hoje, limite),
  );

  return {
    consumo: consumoDesdeAContagem(fornadas, insumos),
    prometido: prometidoParaPedidos(abertos, fichas, insumos, fornadas),
    reservado: reservadoNoPronto(abertos, fornadas),
  };
}
