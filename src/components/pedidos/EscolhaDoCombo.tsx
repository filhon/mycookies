"use client";

import { Check, Minus, Plus, TriangleAlert } from "lucide-react";
import {
  opcoesDaEscolha,
  type FichaParaEscolha,
} from "@/lib/domain/custoFicha";
import { formatarMoeda } from "@/lib/domain/money";
import type { Centavos, EscolhaDoKit, EscolhaFeita } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const CLASSES_PASSO = cn(
  "toque flex items-center justify-center rounded-md border border-line-strong text-ink",
  "transition-colors duration-150 ease-quart hover:bg-sunken",
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
);

/**
 * A escolha da cliente, embaixo da linha do combo: por categoria, as receitas
 * que servem hoje, cada uma com um par de −/+ de 44px.
 *
 * Inline, sem painel e sem modal: em 360px é uma lista curta, e ela está com o
 * WhatsApp aberto do outro lado. O preço avulso ao lado de cada receita é para
 * ela ver o que o combo está substituindo.
 */
export function EscolhaDoCombo({
  kit,
  escolhas,
  fichas,
  aoMudar,
}: {
  kit: { id: string; escolhas?: EscolhaDoKit[] };
  escolhas: EscolhaFeita[];
  /** As fichas vivas, com o preço de venda: é de onde saem as opções. */
  fichas: (FichaParaEscolha & { precificacao: { precoVenda: Centavos } })[];
  /** Mais ou menos `delta` unidades desta receita, por unidade do kit. */
  aoMudar: (
    receita: { id: string; nome: string; custoUnitario: Centavos },
    delta: number,
  ) => void;
}) {
  const feitasDe = (fichaId: string) =>
    escolhas
      .filter((escolha) => escolha.fichaTecnicaId === fichaId)
      .reduce((soma, escolha) => soma + escolha.quantidade, 0);

  const grupos = (kit.escolhas ?? []).map((pedida) => {
    const opcoes = opcoesDaEscolha(pedida, fichas, kit.id);
    const feitas = opcoes.reduce((soma, opcao) => soma + feitasDe(opcao.id), 0);
    return { pedida, opcoes, feitas, cheia: feitas >= pedida.quantidade };
  });

  // O que foi escolhido e não serve mais: receita arquivada, ou que mudou de
  // categoria. Precisa aparecer para poder sair, senão a linha trava sem dizer
  // por quê.
  const servem = new Set(
    grupos.flatMap((grupo) => grupo.opcoes.map((opcao) => opcao.id)),
  );
  const orfas = escolhas.filter(
    (escolha) => !servem.has(escolha.fichaTecnicaId),
  );

  return (
    <div className="space-y-3 rounded-md border border-line bg-sunken/60 px-3 py-2.5">
      {grupos.map(({ pedida, opcoes, feitas, cheia }) => (
        <div key={pedida.categoria}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-label font-medium text-ink">
              {pedida.categoria}
              <span className="text-ink-muted">
                {" "}
                · escolha {pedida.quantidade}
              </span>
            </p>
            <p
              className={cn(
                "num inline-flex items-center gap-1 text-label",
                cheia ? "text-positive" : "text-ink-muted",
              )}
            >
              {cheia && (
                <Check aria-hidden className="size-4" strokeWidth={2} />
              )}
              {feitas} de {pedida.quantidade}
            </p>
          </div>

          {opcoes.length === 0 ? (
            <p className="mt-1 flex items-start gap-1.5 text-label text-attention">
              <TriangleAlert
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={1.75}
              />
              Nenhuma receita serve nesta categoria. Sem ela, o combo não fecha.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {opcoes.map((opcao) => {
                const quantidade = feitasDe(opcao.id);
                return (
                  <li key={opcao.id} className="flex items-center gap-3 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label text-ink">
                        {opcao.nome}
                      </p>
                      <p className="num text-micro text-ink-muted">
                        {formatarMoeda(opcao.precificacao.precoVenda)} avulso
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => aoMudar(opcao, -1)}
                        disabled={quantidade === 0}
                        aria-label={`Tirar um ${opcao.nome}`}
                        className={CLASSES_PASSO}
                      >
                        <Minus aria-hidden className="size-4" strokeWidth={2} />
                      </button>
                      <span
                        className="num w-5 text-center text-body font-semibold text-ink"
                        aria-live="polite"
                        aria-label={`${quantidade} de ${opcao.nome}`}
                      >
                        {quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => aoMudar(opcao, 1)}
                        disabled={cheia}
                        aria-label={`Mais um ${opcao.nome}`}
                        className={CLASSES_PASSO}
                      >
                        <Plus aria-hidden className="size-4" strokeWidth={2} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      {orfas.length > 0 && (
        <ul className="divide-y divide-line border-t border-line pt-2">
          {orfas.map((escolha) => (
            <li
              key={escolha.fichaTecnicaId}
              className="flex items-center gap-3 py-1.5"
            >
              <p className="flex min-w-0 flex-1 items-start gap-1.5 text-label text-attention">
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  {escolha.quantidade} {escolha.nomeSnapshot} não serve mais
                  neste combo.
                </span>
              </p>
              <button
                type="button"
                onClick={() =>
                  aoMudar(
                    {
                      id: escolha.fichaTecnicaId,
                      nome: escolha.nomeSnapshot,
                      custoUnitario: escolha.custoUnitarioSnapshot,
                    },
                    -escolha.quantidade,
                  )
                }
                aria-label={`Tirar ${escolha.nomeSnapshot} do combo`}
                className={CLASSES_PASSO}
              >
                <Minus aria-hidden className="size-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
