"use client";

import type { Route } from "next";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SeloSincronizacao } from "@/components/layout/SeloSincronizacao";
import { LinkVoltar } from "@/components/ui/LinkVoltar";
import { useConexao } from "@/lib/hooks/useDispositivo";
import { cn } from "@/lib/utils/cn";

/** Quanto a rolagem anda antes de a faixa mudar: o tremor do dedo não conta. */
const LIMIAR_ROLAGEM = 8;

/** O que abre o teclado. */
const CAMPO_DE_DIGITAR =
  "input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea";

/**
 * Duas faixas no mesmo `<header>` grudento (`DECISOES.md#d128`).
 *
 * As duas no papel (`DECISOES.md#d243`): a tinta saiu da faixa de contexto,
 * que era a única área cheia de marca no conteúdo. O `bg-canvas` fica porque o
 * `<header>` é grudento e a lista passa por baixo. O filete embaixo é da
 * última faixa: a de ferramentas quando há `children`, senão a de contexto.
 *
 * O selo de sincronização é do cabeçalho, e não da tela (`DECISOES.md#d234`):
 * em toda tela, no mesmo lugar, a linha da descrição.
 *
 * Com o teclado aberto (`apertado:`) o voltar some e o respiro encolhe: o botão
 * físico de voltar do Android existe e fecha o teclado antes de sair, e numa
 * lista com a busca focada cada pixel a menos de cabeçalho é lista a mais.
 *
 * `pt` soma `env(safe-area-inset-top)` ao respiro de sempre: no iPhone
 * instalado, a barra de status é translúcida (`appleWebApp.statusBarStyle`
 * em `layout.tsx`) — sem o respiro extra, o título ficaria atrás do relógio.
 * Sob o relógio, que é branco, fica a tira de tinta do `AppShell`.
 *
 * Com `recolhe`, abaixo de `lg`, a faixa de contexto sai ao descer e volta ao
 * subir (`DECISOES.md#d237`): o `<header>` sobe pela altura dela menos a área
 * segura, e o que sobra dela fica sob a tira de tinta do `AppShell`, com o
 * conteúdo apagado. A altura vem do `ResizeObserver`; a rolagem só lê
 * `scrollY`. Não recolhe sem rede, e com o foco dentro nada muda.
 */
export function CabecalhoPagina({
  titulo,
  descricao,
  voltar,
  acao,
  children,
  className,
  descricaoSempreVisivel = false,
  pendente = false,
  recolhe = false,
}: {
  titulo: string;
  /** Nó, e não texto: o código do pedido vai em `num`. */
  descricao?: ReactNode;
  /** O caminho de volta das telas fora do menu: para onde, e o nome de lá. */
  voltar?: { href: Route; rotulo: string };
  acao?: ReactNode;
  /** Filtros, busca ou resumo que acompanham o título. */
  children?: ReactNode;
  className?: string;
  /**
   * No celular a descrição some por padrão — o título já cabe numa linha só
   * sem ela, e o espaço é curto. A tela Hoje é a exceção: ali a descrição é a
   * data do dia, não uma explicação da tela, e vale a linha também lá.
   */
  descricaoSempreVisivel?: boolean;
  /**
   * O `hasPendingWrites` que a tela já calcula. A queda da rede e a volta o
   * selo sabe sozinho; sem a prop, ele fala só delas (`DECISOES.md#d234`).
   */
  pendente?: boolean;
  /**
   * Só as listas: os editores e as contagens têm o voltar e o Salvar na
   * faixa, e eles não podem sumir.
   */
  recolhe?: boolean;
}) {
  const cabecalhoRef = useRef<HTMLElement>(null);
  const faixaRef = useRef<HTMLDivElement>(null);
  const online = useConexao();
  const [recolhido, setRecolhido] = useState(false);

  // Sem rede, "Salvo no aparelho" precisa estar à vista.
  if (recolhido && !online) setRecolhido(false);

  // Onde o cabeçalho acaba na tela, para o que gruda logo abaixo dele (o dia
  // da lista do caixa, `#d266`). Recolhido, que só sobe abaixo de `lg`, sobra
  // a área segura sem a faixa.
  useEffect(() => {
    const cabecalho = cabecalhoRef.current;
    const faixa = faixaRef.current;
    if (!cabecalho || !faixa) return;

    const raiz = document.documentElement.style;
    const observador = new ResizeObserver(() =>
      raiz.setProperty(
        "--fundo-cabecalho",
        recolhido && !matchMedia("(min-width: 64rem)").matches
          ? `calc(${cabecalho.offsetHeight - faixa.offsetHeight}px + env(safe-area-inset-top))`
          : `${cabecalho.offsetHeight}px`,
      ),
    );
    observador.observe(cabecalho);
    return () => {
      observador.disconnect();
      raiz.removeProperty("--fundo-cabecalho");
    };
  }, [recolhido]);

  useEffect(() => {
    const cabecalho = cabecalhoRef.current;
    const faixa = faixaRef.current;
    if (!recolhe || !online || !cabecalho || !faixa) return;

    let alturaFaixa = faixa.offsetHeight;
    const observador = new ResizeObserver(() => {
      alturaFaixa = faixa.offsetHeight;
      cabecalho.style.setProperty("--altura-faixa", `${alturaFaixa}px`);
    });
    observador.observe(faixa);

    let ancora = window.scrollY;
    let quadro = 0;
    const aoRolar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        const y = window.scrollY;
        // A busca aberta congela a faixa: nem sai nem volta com o teclado.
        // Só campo de digitar: a pílula tocada também guarda o foco, e
        // congelar por ela prendia a faixa recolhida.
        const foco = document.activeElement;
        if (
          foco &&
          cabecalho.contains(foco) &&
          foco.matches(CAMPO_DE_DIGITAR)
        ) {
          ancora = y;
          return;
        }
        if (y <= alturaFaixa) {
          setRecolhido(false);
          ancora = y;
          return;
        }
        const passo = y - ancora;
        if (Math.abs(passo) <= LIMIAR_ROLAGEM) return;
        setRecolhido(passo > 0);
        ancora = y;
      });
    };
    window.addEventListener("scroll", aoRolar, { passive: true });

    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, [recolhe, online]);

  return (
    <header
      ref={cabecalhoRef}
      data-recolhido={recolhido || undefined}
      className={cn(
        "group/cabecalho sticky top-0 z-30",
        // Só o deslize respeita o movimento reduzido; recolher é estado.
        "motion-safe:transition-[translate] motion-safe:duration-220 motion-safe:ease-quart",
        "max-lg:data-recolhido:translate-y-[calc(env(safe-area-inset-top)-var(--altura-faixa,0px))]",
        className,
      )}
    >
      <div
        ref={faixaRef}
        // Tab até o "+" escondido traz a faixa de volta.
        onFocus={() => setRecolhido(false)}
        className={cn(
          "sangria bg-canvas pb-3 pt-[calc(1rem+env(safe-area-inset-top))] apertado:pb-2 apertado:pt-[calc(0.5rem+env(safe-area-inset-top))] lg:pb-5 lg:pt-[calc(2rem+env(safe-area-inset-top))]",
          !children && "border-b border-line",
          // O que sobra sob a barra de status fica sem título.
          "motion-safe:*:transition-opacity motion-safe:*:duration-220 motion-safe:*:ease-quart max-lg:group-data-recolhido/cabecalho:*:opacity-0",
        )}
      >
        {voltar && (
          <LinkVoltar href={voltar.href} className="apertado:hidden">
            {voltar.rotulo}
          </LinkVoltar>
        )}

        <div
          className={cn(
            "flex items-center justify-between gap-4",
            voltar && "mt-1 apertado:mt-0",
          )}
        >
          <div className="min-w-0">
            <h1 className="truncate font-display text-title font-semibold text-ink lg:text-display">
              {titulo}
            </h1>
            {/* O selo mora na linha da descrição, nunca ao lado do "+": em
                360px o título já disputa espaço com ele. No celular, onde a
                descrição some, a linha só ocupa altura quando o selo fala. */}
            <div className="flex flex-wrap items-center gap-x-2">
              {descricao && (
                <p
                  className={cn(
                    "mt-1 max-w-[52ch] text-label text-ink-muted lg:text-body",
                    !descricaoSempreVisivel && "hidden lg:block",
                  )}
                >
                  {descricao}
                </p>
              )}
              {/* O `status` só em volta do selo, e não da linha inteira: a
                  descrição de algumas telas muda com o dado, e a leitora de
                  tela não precisa ouvi-la de novo. Sempre montado, mesmo
                  vazio, para a queda da rede ser anunciada. */}
              <span role="status" className="not-empty:mt-1">
                <SeloSincronizacao pendente={pendente} />
              </span>
            </div>
          </div>
          {acao && <div className="shrink-0">{acao}</div>}
        </div>
      </div>

      {children && (
        <div className="sangria border-b border-line bg-canvas py-3 lg:py-4">
          {children}
        </div>
      )}
    </header>
  );
}
