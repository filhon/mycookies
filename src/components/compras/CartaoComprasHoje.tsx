"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ShoppingCart, TriangleAlert } from "lucide-react";
import { orderBy, query, where } from "firebase/firestore";
import { listarNomes, texto } from "@/components/producao/FraseDaCapacidade";
import { dataISODe, diaVizinho } from "@/lib/domain/datas";
import {
  entraNaLista,
  explodirDemanda,
  montarLista,
  resumoDaLista,
  type ResumoDaLista,
} from "@/lib/domain/listaCompras";
import { formatarMoeda } from "@/lib/domain/money";
import {
  fichasAbaixoDoPiso,
  produzidoParaPedidos,
  reservaDeProducao,
} from "@/lib/domain/producao";
import { colFichas } from "@/lib/firebase/colecoes";
import { consultaListaAtual } from "@/lib/firebase/mutations/listasCompra";
import { useColecao } from "@/lib/hooks/useColecao";
import {
  contextoDaCapacidade,
  useDespensaParaProduzir,
} from "@/lib/hooks/useDespensaParaProduzir";
import type { FichaTecnica, ListaCompras } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";

/** A mesma semana da agenda: o que vai para a massa nos próximos dias. */
const DIAS_ADIANTE = 7;

/**
 * A previsão de compras, na tela que ela abre de manhã.
 *
 * Existe quando há qualquer uma das três: lista aberta com item por comprar,
 * ficha abaixo do próprio piso, ou pedido confirmado no horizonte sem lista
 * montada (`DECISOES.md#d96`). E diz o número em vez do gênero da coisa: o que
 * a lista aberta ainda pede, ou — sem lista — o que uma lista montada agora
 * pediria, com a reserva dentro.
 *
 * `/compras` não entra na navegação inferior porque cinco destinos é o teto
 * (`src/components/layout/navegacao.ts`) — chega-se por aqui e por `/pedidos`.
 */
export function CartaoComprasHoje() {
  const contaId = useContaId();
  const [hoje] = useState(() => dataISODe(new Date()));
  const limite = useMemo(() => diaVizinho(hoje, DIAS_ADIANTE), [hoje]);

  const consultaLista = useMemo(() => consultaListaAtual(contaId), [contaId]);
  const consultaFichas = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );

  const listas = useColecao<ListaCompras>(consultaLista);
  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const { pedidos, insumos, fornadas, carregando } = useDespensaParaProduzir(
    contaId,
    hoje,
  );

  const lista = listas.dados[0] ?? null;

  const paraProduzir = useMemo(
    () => pedidos.dados.filter((pedido) => entraNaLista(pedido, hoje, limite)),
    [pedidos.dados, hoje, limite],
  );

  // O que a massa já levou e o que os pedidos abertos ainda vão levar: o mesmo
  // contexto de `/fichas`, para o cartão não discordar da linha da ficha.
  const contexto = useMemo(
    () =>
      contextoDaCapacidade(
        pedidos.dados,
        fichas.dados,
        insumos.dados,
        fornadas.dados,
        hoje,
      ),
    [pedidos.dados, fichas.dados, insumos.dados, fornadas.dados, hoje],
  );

  /** O que a lista aberta ainda pede; sem lista, o que uma montada agora pediria. */
  const resumo: ResumoDaLista = useMemo(() => {
    if (lista) return resumoDaLista(lista.itens);

    const demanda = explodirDemanda(paraProduzir, fichas.dados);
    const montada = montarLista(demanda, insumos.dados, hoje, {
      consumo: contexto.consumo,
      produzido: produzidoParaPedidos(fornadas.dados, demanda.pedidoIds),
      piso: reservaDeProducao(fichas.dados),
    });
    return resumoDaLista(
      montada.linhas.map((linha) => ({ ...linha, comprado: false })),
    );
  }, [
    lista,
    paraProduzir,
    fichas.dados,
    insumos.dados,
    fornadas.dados,
    contexto,
    hoje,
  ]);

  const abaixoDoPiso = useMemo(
    () =>
      fichasAbaixoDoPiso(
        fichas.dados,
        insumos.dados,
        contexto.consumo,
        hoje,
        contexto.prometido,
      ),
    [fichas.dados, insumos.dados, contexto, hoje],
  );

  const faltam = resumo.aComprar - resumo.comprados;
  const mostrar =
    faltam > 0 ||
    abaixoDoPiso.length > 0 ||
    (!lista && paraProduzir.length > 0);

  // Carregando não vira esqueleto: este cartão pode simplesmente não existir, e
  // um bloco cinza que some depois mexeria com a tela embaixo dele.
  if (carregando || listas.carregando || fichas.carregando || !mostrar) {
    return null;
  }

  const titulo =
    faltam > 0
      ? `Faltam ${faltam} ${faltam === 1 ? "item" : "itens"} · ${formatarMoeda(resumo.restante)}`
      : "Ver o que comprar";

  const piso = fraseDoPiso(abaixoDoPiso);
  const detalhe =
    piso ??
    (paraProduzir.length > 0
      ? `${paraProduzir.length} ${paraProduzir.length === 1 ? "pedido confirmado" : "pedidos confirmados"} para os próximos dias`
      : "Sua lista de compras está aberta");

  return (
    <Link
      href="/compras"
      className="flex items-center gap-3 rounded-lg border border-line bg-surface px-5 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      <ShoppingCart
        aria-hidden
        className="size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="num block text-body font-medium text-ink">
          {titulo}
        </span>
        {/* Abaixo do piso vem com ícone: a cor nunca é o único portador de
            significado. */}
        <span
          className={`num mt-0.5 flex items-start gap-1.5 text-label ${piso ? "text-attention" : "text-ink-muted"}`}
        >
          {piso && (
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={2}
            />
          )}
          <span>{detalhe}</span>
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
    </Link>
  );
}

/**
 * A ficha que caiu abaixo do piso, dita como ela pensa: "O cookie não dá nem
 * uma fornada — trava no chocolate". Com mais de uma, os nomes.
 */
function fraseDoPiso(
  abaixo: ReturnType<typeof fichasAbaixoDoPiso>,
): string | null {
  const primeira = abaixo[0];
  if (!primeira) return null;

  if (abaixo.length > 1) {
    return `${abaixo.length} produtos abaixo da reserva: ${listarNomes(
      abaixo.map((atual) => atual.capacidade.nome),
      3,
    )}`;
  }

  const { capacidade, fornadasMinimas } = primeira;
  const trava = capacidade.gargalo
    ? `, trava em ${capacidade.gargalo.nome}`
    : "";
  if (capacidade.fornadas === 0) {
    return `${capacidade.nome} não dá nem uma fornada${trava}`;
  }
  const da = capacidade.fornadas ?? 0;
  return `${capacidade.nome} dá só ${texto(da)} ${da === 1 ? "fornada" : "fornadas"}, e a reserva é ${texto(fornadasMinimas)}${trava}`;
}
