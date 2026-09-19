"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ChevronRight, RefreshCw, TriangleAlert } from "lucide-react";
import {
  FraseDaCapacidade,
  FraseDoPronto,
} from "@/components/producao/FraseDaCapacidade";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import {
  ROTULO_UNIDADE_RENDIMENTO,
  SUFIXO_UNIDADE_RENDIMENTO,
} from "@/lib/domain/custoFicha";
import { formatarMoeda } from "@/lib/domain/money";
import type {
  CapacidadeDaFicha,
  ProjecaoDoPronto,
} from "@/lib/domain/producao";
import type { FichaTecnica } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** As seis colunas da tabela, na proporção da prancha (`#d129`). */
export const COLUNAS_FICHA = "lg:grid-cols-[2.4fr_1fr_1.2fr_1.2fr_1.2fr_1.4fr]";

/** O `lg:` do Tailwind, para o clique decidir entre o painel e o editor. */
const DESKTOP = "(min-width: 64rem)";

/**
 * Uma ficha na lista: nome, o que ela custa, o que ela deixa e quantas
 * fornadas a despensa aguenta hoje.
 *
 * O preço sozinho não informa, então ele nunca aparece sozinho: embaixo dele
 * vem o que sobra por unidade, que é a pergunta que trouxe a Maynara até aqui.
 *
 * Dois arranjos no mesmo `<li>`, e o `display: none` tira o oculto da árvore de
 * acessibilidade: o leitor de tela ouve um só.
 *
 * **No celular**, três andares, e não duas colunas. Em cima, nome e preço; no
 * meio, custo e sobra, com a sobra alinhada sob o preço; embaixo, o que está
 * pronto e quantas fornadas dá, na largura inteira da linha. Com as frases de
 * produção na coluna da esquerda, ao lado do preço, cada uma quebrava em três
 * a cinco linhas num celular de 360px, e a lista virava um muro de texto.
 *
 * **No desktop**, a linha da tabela: os seis números que respondem "qual
 * produto rende mais?" lado a lado, e o clique abre o painel ao lado da lista
 * em vez de sair dela (`#d130`). Botão do meio, Ctrl+clique e menu de contexto
 * continuam abrindo o editor, como em todo link.
 */
export function LinhaFicha({
  ficha,
  capacidade,
  pronto,
  selecionada = false,
  aoSelecionar,
}: {
  ficha: FichaTecnica;
  /** `null` quando não há pergunta: ficha sem insumo ou sem rendimento. */
  capacidade?: CapacidadeDaFicha | null;
  /** O que está pronto, e quanto disso já é de pedido aberto (13D). */
  pronto?: { pronto: ProjecaoDoPronto; reservado: number };
  /** A linha cujo produto está no painel ao lado. Só no desktop. */
  selecionada?: boolean;
  /** No desktop, o clique simples abre o painel em vez de navegar. */
  aoSelecionar?: () => void;
}) {
  const lucro = ficha.precificacao.lucroUnitario;
  const noPrejuizo = lucro < 0;
  const temProducao =
    !!pronto ||
    !!capacidade ||
    ficha.tipo === "KIT" ||
    ficha.custoDesatualizado;

  function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
    if (
      !aoSelecionar ||
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
    aoSelecionar();
  }

  const selos = (
    <>
      {ficha.tipo === "KIT" && <Selo tom="neutro">Kit</Selo>}
      {ficha.custoDesatualizado && (
        <Selo
          tom="atencao"
          icone={<RefreshCw aria-hidden className="size-3.5" />}
        >
          Custo desatualizado
        </Selo>
      )}
    </>
  );

  const producao = (
    <>
      {pronto && (
        <FraseDoPronto
          projecao={pronto.pronto}
          unidade={ficha.unidadeRendimento}
          reservado={pronto.reservado}
        />
      )}
      {capacidade && <FraseDaCapacidade capacidade={capacidade} />}
    </>
  );

  // No prejuízo o ícone acompanha a cor: a cor sozinha nunca decide.
  const icone = noPrejuizo && (
    <TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
  );

  return (
    <li>
      <Link
        href={`/fichas/${ficha.id}`}
        onClick={aoClicar}
        aria-current={selecionada ? "true" : undefined}
        className={cn(
          "block transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken",
          selecionada && "bg-sunken",
        )}
      >
        {/* ---- celular: os três andares ---- */}
        <div className="px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
              {ficha.nome}
            </p>
            <Dinheiro centavos={ficha.precificacao.precoVenda} />
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-ink-subtle"
              strokeWidth={1.75}
            />
          </div>

          {/* `pr-8` é a seta mais o vão: a sobra fica debaixo do preço. */}
          <div className="mt-0.5 flex items-baseline gap-3 pr-8">
            <p className="num min-w-0 flex-1 truncate text-label text-ink-muted">
              custa {formatarMoeda(ficha.custoUnitario)}
              <span className="mx-1.5 text-ink-subtle">·</span>
              rende {ficha.rendimento}{" "}
              {ROTULO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
            </p>
            <p
              className={cn(
                "num flex shrink-0 items-center gap-1 text-micro",
                noPrejuizo ? "text-negative" : "text-ink-muted",
              )}
            >
              {icone}
              {noPrejuizo
                ? `perde ${formatarMoeda(Math.abs(lucro))}`
                : `sobram ${formatarMoeda(lucro)}`}
            </p>
          </div>

          {temProducao && (
            <div className="mt-2 flex flex-wrap items-start gap-x-5 gap-y-1">
              {producao}
              {selos}
            </div>
          )}
        </div>

        {/* ---- desktop: a linha da tabela ---- */}
        <div
          className={cn(
            "hidden items-center gap-x-4 px-4 py-3 lg:grid",
            COLUNAS_FICHA,
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 truncate text-body font-semibold text-ink">
                {ficha.nome}
              </p>
              {selos}
            </div>
            {(pronto || capacidade) && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                {producao}
              </div>
            )}
          </div>
          <p className="num text-right text-body text-ink">
            <span className="sr-only">rende </span>
            {ficha.rendimento}{" "}
            {SUFIXO_UNIDADE_RENDIMENTO[ficha.unidadeRendimento]}
          </p>
          <p className="num text-right text-body text-ink">
            <span className="sr-only">custa </span>
            {formatarMoeda(ficha.custoUnitario)}
          </p>
          <p className="num text-right text-body text-ink">
            <span className="sr-only">sugerido </span>
            {formatarMoeda(ficha.precificacao.precoSugerido)}
          </p>
          <p className="num text-right text-body font-semibold text-ink">
            <span className="sr-only">praticado </span>
            {formatarMoeda(ficha.precificacao.precoVenda)}
          </p>
          <p
            className={cn(
              "num flex items-center justify-end gap-1 text-body font-semibold",
              noPrejuizo ? "text-negative" : "text-ink",
            )}
          >
            <span className="sr-only">{noPrejuizo ? "perde " : "sobram "}</span>
            {icone}
            {/* O sinal é para quem vê: o leitor de tela já ouviu "perde". */}
            {noPrejuizo && <span aria-hidden>−</span>}
            {formatarMoeda(Math.abs(lucro))}
          </p>
        </div>
      </Link>
    </li>
  );
}
