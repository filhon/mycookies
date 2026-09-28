"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { LeituraDoCardapio } from "@/lib/domain/caixa";
import { rotuloMes } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { CompetenciaMensal } from "@/lib/types";
import { DESKTOP } from "./LinhaFicha";

/**
 * O que o mês diz do cardápio (`#d232`): até três frases de quanto vende ×
 * quanto deixa, cada uma com o nome que abre o produto. No celular, um
 * `<details>` fechado com a primeira frase à vista: a lista é o que ela veio
 * buscar. No desktop, aberto.
 */
export function LeituraDoMes({
  leitura,
  competencia,
  aoAbrir,
}: {
  leitura: LeituraDoCardapio;
  competencia: CompetenciaMensal;
  /** No desktop, o nome abre o painel em vez do editor. */
  aoAbrir: (fichaId: string) => void;
}) {
  const idTitulo = useId();
  const detalhes = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (detalhes.current && window.matchMedia(DESKTOP).matches) {
      detalhes.current.open = true;
    }
  }, []);

  function nome(fichaId: string, texto: string) {
    return (
      <Link
        href={`/fichas/${fichaId}`}
        onClick={(evento: MouseEvent<HTMLAnchorElement>) => {
          if (
            evento.button !== 0 ||
            evento.metaKey ||
            evento.ctrlKey ||
            evento.shiftKey ||
            evento.altKey ||
            !window.matchMedia(DESKTOP).matches
          ) {
            return;
          }
          evento.preventDefault();
          aoAbrir(fichaId);
        }}
        className="rounded-sm font-semibold text-brand-ink underline underline-offset-2"
      >
        {texto}
      </Link>
    );
  }

  const { sustenta, vendeMuito, deixaMuito } = leitura;
  const frases: ReactNode[] = [];
  if (sustenta) {
    frases.push(
      <>
        {nome(sustenta.fichaId, sustenta.nome)} deixou{" "}
        {formatarMoeda(sustenta.lucro)} em {sustenta.quantidade} vendidos, o que
        mais sustentou o mês.
      </>,
    );
  }
  if (vendeMuito) {
    // A conta assume as mesmas vendas: o Rende não sabe quanto a cliente
    // aceita, e nunca diz "suba o preço" (`#d233`).
    frases.push(
      <>
        {nome(vendeMuito.fichaId, vendeMuito.nome)} vendeu{" "}
        {vendeMuito.quantidade} e {vendeMuito.sobra < 0 ? "perde" : "deixa"}{" "}
        {formatarMoeda(Math.abs(vendeMuito.sobra))} em cada.{" "}
        {formatarMoeda(vendeMuito.aMais)} a mais, com as mesmas vendas, teriam
        sido {formatarMoeda(vendeMuito.noMes)} no mês.
      </>,
    );
  }
  if (deixaMuito) {
    frases.push(
      <>
        {nome(deixaMuito.fichaId, deixaMuito.nome)} deixa{" "}
        {formatarMoeda(deixaMuito.sobra)} em cada e vendeu{" "}
        {deixaMuito.quantidade} no mês.
      </>,
    );
  }

  const [primeira, ...resto] = frases;
  const titulo = (
    <>
      <h2 id={idTitulo} className="text-subheading font-semibold text-ink">
        O que {rotuloMes(competencia)} diz
      </h2>
      <p className="num mt-1 text-body text-ink">{primeira}</p>
    </>
  );

  return (
    <section
      aria-labelledby={idTitulo}
      className="mt-2 rounded-lg border border-line bg-surface"
    >
      {resto.length === 0 ? (
        <div className="px-4 py-3">{titulo}</div>
      ) : (
        <details ref={detalhes} className="group">
          <summary className="toque flex cursor-pointer list-none items-start justify-between gap-3 rounded-lg px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 max-w-[72ch]">{titulo}</div>
            <ChevronDown
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-ink-muted transition-transform duration-150 ease-quart group-open:rotate-180"
              strokeWidth={1.75}
            />
          </summary>
          <div className="max-w-[72ch] space-y-2 px-4 pb-4">
            {resto.map((frase, indice) => (
              <p key={indice} className="num text-body text-ink">
                {frase}
              </p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
