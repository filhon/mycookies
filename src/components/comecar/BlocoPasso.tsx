"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, ChevronDown } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";
import type { EstadoPasso, PassoBase } from "@/lib/domain/onboarding";
import { cn } from "@/lib/utils/cn";
import { SeloDoPasso } from "./Trilha";

/**
 * Um dos cinco passos, em `/comecar`.
 *
 * **Dois arranjos da mesma estrutura.** No celular, um por bloco: o de agora
 * aberto, os outros fechados e abrindo no toque — a tela é estreita e a ação
 * primária precisa caber inteira. No desktop os cinco ficam abertos ao mesmo
 * tempo, porque ver o mapa inteiro é o que a tela grande tem de melhor.
 *
 * `estado` nulo é o modo referência: com o caminho já encerrado, as cinco
 * perguntas não são feitas (`DECISOES.md#d67`), e um selo dizendo "depois" sobre
 * um passo que ninguém consultou seria uma afirmação inventada.
 */
export function BlocoPasso({
  passo,
  estado,
  aberto,
  dobravel,
  aoAlternar,
}: {
  passo: PassoBase;
  estado: EstadoPasso | null;
  aberto: boolean;
  /** Falso no desktop, onde os cinco convivem abertos. */
  dobravel: boolean;
  aoAlternar: () => void;
}) {
  const agora = estado === "AGORA";
  const idCorpo = `passo-${passo.id.toLowerCase()}`;

  const cabeca = (
    <>
      <span
        aria-hidden
        className={cn(
          "num flex size-8 shrink-0 items-center justify-center rounded-full text-label font-semibold",
          estado === "FEITO" && "bg-positive-soft text-positive",
          agora && "bg-wine-700 text-on-wine",
          (estado === "DEPOIS" || estado === null) &&
            "border border-line-strong text-ink-muted",
        )}
      >
        {passo.numero}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">
          {passo.titulo}
        </span>
        {estado && (
          <span className="mt-1.5 flex">
            <SeloDoPasso estado={estado} />
          </span>
        )}
      </span>
    </>
  );

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface",
        // O filete dourado da embalagem marca o passo de agora, como marca o
        // cartão da tela Hoje: é o mesmo "é este aqui" nas duas telas.
        agora && "filete-dourado",
      )}
    >
      {dobravel ? (
        <button
          type="button"
          onClick={aoAlternar}
          aria-expanded={aberto}
          // Só quando existe: apontar para um id que não está na página é um
          // ponteiro quebrado para o leitor de tela.
          aria-controls={aberto ? idCorpo : undefined}
          className="toque flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
        >
          {cabeca}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-ink-subtle transition-transform duration-150 ease-quart",
              aberto && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-4">
          {cabeca}
        </div>
      )}

      {aberto && (
        <div id={idCorpo} className="px-4 pb-4 lg:px-5 lg:pb-5">
          <div className="lg:ml-11">
            <p className="max-w-[62ch] text-label text-ink-muted">
              {passo.porque}
            </p>

            {/* Sem caixa dentro de caixa: o que separa as duas frases é o
                rótulo em tinta cheia, e não uma superfície nova. */}
            <p className="mt-2.5 max-w-[62ch] text-label text-ink-muted">
              <span className="font-semibold text-ink">O que esperar: </span>
              {passo.oQueEsperar}
            </p>

            {/* Uma ação por bloco, e só a do passo de agora é primária: duas
                ações primárias na mesma tela não são uma escolha, são uma
                dúvida. */}
            <div className="mt-4">
              <Link
                href={passo.href as Route}
                className={classesBotao(
                  agora
                    ? {
                        variante: "primaria",
                        tamanho: "lg",
                        className: "w-full sm:w-auto",
                      }
                    : { variante: "terciaria", tamanho: "sm" },
                )}
              >
                {passo.rotuloAcao}
                <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
