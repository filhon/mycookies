"use client";

import Link from "next/link";
import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { ChevronRight, TrendingDown, TriangleAlert } from "lucide-react";
import { custosDeHoje } from "@/lib/domain/custoFicha";
import { colFichas, colInsumos } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { FichaTecnica, Insumo } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { fraseSetaSobra } from "./LinhaFicha";

/**
 * O alerta que salva assinatura: "o chocolate subiu, três produtos ficaram no
 * vermelho" (`docs/saas/CLAUDE.md`). Só existe quando algum produto vivo
 * cruzou uma linha desde o último Salvar — o zero, ou a margem pedida
 * (`#d136`). Cartão permanente é paisagem: ele conta cruzamento, nunca o
 * centavo que a seta de `/fichas` mostra em toda diferença.
 */
export function CartaoNoVermelhoHoje() {
  const contaId = useContaId();

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

  const fichas = useColecao<FichaTecnica>(consultaFichas);
  const insumos = useColecao<Insumo>(consultaInsumos);

  const hojes = useMemo(
    () => custosDeHoje(fichas.dados, insumos.dados),
    [fichas.dados, insumos.dados],
  );

  const caidas = useMemo(
    () =>
      fichas.dados
        .filter((ficha) => hojes.get(ficha.id)?.caiu)
        .sort(
          (a, b) =>
            (hojes.get(a.id)?.sobra ?? 0) - (hojes.get(b.id)?.sobra ?? 0),
        ),
    [fichas.dados, hojes],
  );

  const pior = caidas[0];

  // Carregando não vira esqueleto: como o cartão de compras, ele pode
  // simplesmente não existir.
  if (fichas.carregando || insumos.carregando || !pior) {
    return null;
  }

  const hojePior = hojes.get(pior.id)!;
  const noPrejuizo = hojePior.sobra < 0;

  const titulo =
    caidas.length === 1
      ? `${pior.nome} ficou ${noPrejuizo ? "no vermelho" : "abaixo da margem"}`
      : `${caidas.length} produtos ficaram abaixo da margem depois da última compra`;

  const seta = fraseSetaSobra(pior.precificacao.lucroUnitario, hojePior.sobra);
  const culpado = hojePior.culpado ? ` · ${hojePior.culpado.nome} subiu` : "";
  // O nome que importa é o pior; os outros estão a um toque, e não em texto.
  const detalhe =
    caidas.length === 1
      ? `${seta}${culpado}`
      : `${pior.nome}: ${seta} · e mais ${caidas.length - 1}`;

  return (
    <Link
      href={caidas.length === 1 ? `/fichas/${pior.id}` : "/fichas"}
      className="flex items-center gap-3 rounded-lg border border-line bg-surface px-5 py-4 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      <TrendingDown
        aria-hidden
        className="size-5 shrink-0 text-ink-muted"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">{titulo}</span>
        {/* Cor nunca sozinha: o ícone acompanha o vermelho e o âmbar. */}
        <span
          className={`num mt-0.5 flex items-start gap-1.5 text-label ${
            noPrejuizo ? "text-negative" : "text-attention"
          }`}
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0"
            strokeWidth={2}
          />
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
