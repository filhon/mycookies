"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { ArrowRight, Check, Compass } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilosBotao";
import { concluirPrimeirosPassos } from "@/lib/firebase/mutations/conta";
import { useComeco } from "@/lib/hooks/useComeco";
import { useAuth } from "@/providers/AuthProvider";
import { Trilha } from "./Trilha";

/**
 * O caminho do começo, na tela em que o aplicativo abre.
 *
 * Mostra **um passo por vez**: o de agora, com a frase do que se perde sem ele e
 * a ação que leva até lá. Os outros quatro ficam em `/comecar`, que é o mapa —
 * este cartão é o retorno, porque fazer o passo tira ela desta tela e a
 * navegação inferior a traz de volta para cá.
 *
 * Fica **acima do `CartaoMetaHoje`** enquanto existir: enquanto o caminho não
 * terminou, "o que eu faço agora" vem antes de "como estou indo". Quando ele
 * termina, o cartão some e a tela Hoje volta a ser exatamente o que era, sem uma
 * linha de diferença.
 */
export function CartaoPrimeirosPassos() {
  const { contaId } = useAuth();
  const { progresso, proximo, carregando, encerrado } = useComeco();
  const [encerradoAqui, setEncerradoAqui] = useState(false);

  // Carregando não vira esqueleto: um "0 de 5" que aparece e some no instante
  // seguinte mexeria com a tela inteira embaixo dele.
  if (!contaId || carregando || encerrado || encerradoAqui) return null;

  function encerrar() {
    if (!contaId) return;
    setEncerradoAqui(true);
    // Sem esperar a promessa: o cache local já aplicou a escrita e é ele que
    // desenha a tela (`DECISOES.md#d40`, `#d62`). Sem rede, a escrita fica na
    // fila e sobe depois. Uma falha de verdade traz o cartão de volta na
    // próxima abertura, que é o pior caso e não custa um centavo.
    concluirPrimeirosPassos(contaId).catch(() => undefined);
  }

  return (
    <section
      aria-labelledby="primeiros-passos"
      className="filete-dourado overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="primeiros-passos"
            className="flex items-center gap-2 text-label font-medium text-ink-muted"
          >
            <Compass
              aria-hidden
              className="size-4 shrink-0"
              strokeWidth={1.75}
            />
            Primeiros passos
          </h2>
          <span className="num shrink-0 text-label font-semibold text-ink">
            {progresso.feitos} de {progresso.total}
          </span>
        </div>

        <Trilha
          className="mt-2.5"
          feitos={progresso.feitos}
          total={progresso.total}
        />

        {progresso.concluido || !proximo ? (
          <Fechamento aoConcluir={encerrar} />
        ) : (
          <>
            {/* O número do passo é o mesmo distintivo de `/comecar`: as duas
                telas falam do mesmo caminho e precisam parecer a mesma coisa. */}
            <div className="mt-4 flex items-start gap-3">
              <span
                aria-hidden
                className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-wine-700 text-label font-semibold text-on-wine"
              >
                {proximo.numero}
              </span>
              <div className="min-w-0">
                <h3 className="text-heading font-semibold text-ink">
                  <span className="sr-only">
                    Passo {proximo.numero} de {progresso.total}:{" "}
                  </span>
                  {proximo.titulo}
                </h3>
                <p className="mt-1.5 max-w-[52ch] text-label text-ink-muted">
                  {proximo.porque}
                </p>
              </div>
            </div>

            {/* 52px no celular: é a ação primária da tela de entrada, e ela a
                toca em pé, com farinha no dedo. */}
            <div className="mt-4">
              <Link
                href={proximo.href as Route}
                className={classesBotao({
                  variante: "primaria",
                  tamanho: "lg",
                  className: "w-full sm:w-auto",
                })}
              >
                {proximo.rotuloAcao}
                <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
              </Link>
            </div>
          </>
        )}
      </div>

      {/* As duas saídas: o mapa dos cinco, e a porta de quem não quer o
          caminho. A segunda existe desde o primeiro render e não pede
          confirmação — ela é dona do negócio (`DECISOES.md#d68`). */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 border-t border-line px-2 py-1">
        <Link
          href="/comecar"
          className={classesBotao({ variante: "terciaria", tamanho: "sm" })}
        >
          Ver os cinco passos
        </Link>

        {!progresso.concluido && (
          <button
            type="button"
            onClick={encerrar}
            className="toque rounded-md px-3 text-label text-ink-muted transition-colors duration-150 ease-quart hover:text-ink"
          >
            Não preciso disto agora
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * O fim do caminho, sem festa e sem número inventado: o sistema não parabeniza
 * uma adulta por ter usado o produto dela. O que a frase diz é o que ela tem
 * agora — e diz também para onde o guia vai, porque um cartão que some sem
 * avisar vira uma pergunta na semana seguinte.
 */
function Fechamento({ aoConcluir }: { aoConcluir: () => void }) {
  return (
    <>
      <h3 className="mt-4 flex items-start gap-2 font-display text-title font-semibold text-ink">
        <Check
          aria-hidden
          className="mt-1 size-5 shrink-0 text-positive"
          strokeWidth={2.25}
        />
        Os cinco passos estão feitos
      </h3>
      <p className="mt-1.5 max-w-[52ch] text-label text-ink-muted">
        O custo dos seus doces, a agenda da semana e o caixa do mês estão de pé.
      </p>
      <p className="mt-2 max-w-[52ch] text-label text-ink-muted">
        Ao concluir, este cartão sai da tela Hoje. Os cinco passos continuam em
        Como funciona, sempre que você quiser conferir.
      </p>

      <div className="mt-4">
        <Botao
          variante="primaria"
          tamanho="lg"
          onClick={aoConcluir}
          className="w-full sm:w-auto"
        >
          Concluir
        </Botao>
      </div>
    </>
  );
}
