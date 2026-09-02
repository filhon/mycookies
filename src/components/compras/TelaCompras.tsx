"use client";

import { useMemo, useState } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { HORIZONTE_MAXIMO, ListaDoMercado } from "./ListaDoMercado";
import { dataISODe, diaVizinho } from "@/lib/domain/datas";
import { colFichas, colInsumos, colPedidos } from "@/lib/firebase/colecoes";
import { consultaListaAtual } from "@/lib/firebase/mutations/listasCompra";
import { useColecao } from "@/lib/hooks/useColecao";
import type { FichaTecnica, Insumo, ListaCompras, Pedido } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/**
 * Carrega o que a lista precisa e só então monta a tela.
 *
 * Mesma separação do editor de pedido, e pelo mesmo motivo: a tela guarda o
 * período em estado, e um estado inicial que nasce antes dos dados vira um
 * efeito reescrevendo a escolha que a usuária já fez.
 *
 * Os pedidos vêm no maior horizonte de uma vez, e o período recorta em memória.
 * São dezenas de pedidos por mês, e uma consulta por horizonte seria três
 * assinaturas para responder a mesma pergunta.
 */
export function TelaCompras() {
  const contaId = useContaId();
  const [hoje] = useState(() => dataISODe(new Date()));
  const limite = useMemo(() => diaVizinho(hoje, HORIZONTE_MAXIMO), [hoje]);

  const consultaLista = useMemo(() => consultaListaAtual(contaId), [contaId]);

  const consultaPedidos = useMemo(
    () =>
      query(
        colPedidos(contaId),
        where("arquivado", "==", false),
        where("dataEntregaISO", ">=", hoje),
        where("dataEntregaISO", "<=", limite),
        orderBy("dataEntregaISO"),
      ),
    [contaId, hoje, limite],
  );

  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
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

  const listas = useColecao<ListaCompras>(consultaLista);
  const pedidos = useColecao<Pedido>(consultaPedidos);
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const insumos = useColecao<Insumo>(consultaInsumos);

  const carregando =
    listas.carregando ||
    pedidos.carregando ||
    fichas.carregando ||
    insumos.carregando;

  if (carregando) {
    return (
      <div role="status" aria-label="Carregando" className="space-y-4 pt-4">
        <Esqueleto className="h-10 w-2/3 rounded-md" />
        {[0, 1].map((indice) => (
          <Esqueleto key={indice} className="h-56 rounded-lg" />
        ))}
      </div>
    );
  }

  if (listas.erro || pedidos.erro) {
    return (
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
        <EstadoVazio
          titulo="Não deu para carregar a lista"
          descricao="Verifique a conexão. O que já foi aberto antes continua disponível offline."
        />
      </div>
    );
  }

  return (
    <ListaDoMercado
      contaId={contaId}
      lista={listas.dados[0] ?? null}
      pedidos={pedidos.dados}
      fichas={fichas.dados}
      insumos={insumos.dados}
      hoje={hoje}
      pendente={listas.pendente || insumos.pendente}
    />
  );
}
