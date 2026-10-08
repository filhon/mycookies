"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface Ancora {
  /** O `id` da `<section>` na página. */
  id: string;
  rotulo: string;
}

/**
 * O índice da faixa de ferramentas: uma pílula por parte, com `aria-current`
 * na parte em leitura (`DECISOES.md#d283`, `#d295`). É a última parte cujo
 * pedaço passa pela metade de cima da tela, abaixo do cabeçalho: no fim da
 * página, onde a última parte não chega ao topo, ela ainda acende.
 *
 * No celular a faixa rola na horizontal e a pílula ativa é rolada à vista;
 * `className` troca o arranjo (a Configuração, com três, usa a grade).
 */
export function IndiceDaPagina({
  ancoras,
  rotulo,
  className,
}: {
  ancoras: readonly Ancora[];
  rotulo: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [atual, setAtual] = useState(ancoras[0]?.id);
  const ativa = ancoras.some((a) => a.id === atual) ? atual : ancoras[0]?.id;

  // As âncoras mudam com a página (a seção de instalar some, os cinco mudam
  // de lugar), e o observador é refeito com elas.
  const ids = ancoras.map((a) => a.id).join(" ");

  useEffect(() => {
    const lista = ids.split(" ");
    const cabecalho = ref.current?.closest("header");
    const visiveis = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) visiveis.add(entrada.target.id);
          else visiveis.delete(entrada.target.id);
        }
        const emLeitura = lista.filter((id) => visiveis.has(id)).at(-1);
        if (emLeitura) setAtual(emLeitura);
      },
      { rootMargin: `-${cabecalho?.offsetHeight ?? 0}px 0px -50% 0px` },
    );
    for (const id of lista) {
      const elemento = document.getElementById(id);
      if (elemento) observador.observe(elemento);
    }
    return () => observador.disconnect();
  }, [ids]);

  // Só a rolagem da faixa, nunca a da página: `scrollIntoView` puxaria a
  // janela junto.
  useEffect(() => {
    const faixa = ref.current;
    const pilula = faixa?.querySelector<HTMLElement>("[aria-current]");
    if (!faixa || !pilula || faixa.scrollWidth <= faixa.clientWidth) return;
    const esquerda = pilula.offsetLeft - faixa.offsetLeft;
    if (
      esquerda < faixa.scrollLeft ||
      esquerda + pilula.offsetWidth > faixa.scrollLeft + faixa.clientWidth
    ) {
      faixa.scrollTo({ left: esquerda - 16 });
    }
  }, [ativa]);

  return (
    <nav
      ref={ref}
      aria-label={rotulo}
      className={cn(
        "flex snap-x gap-2 overflow-x-auto [scrollbar-width:none]",
        className,
      )}
    >
      {ancoras.map((ancora) => {
        const acesa = ativa === ancora.id;
        return (
          <a
            key={ancora.id}
            href={`#${ancora.id}`}
            onClick={() => setAtual(ancora.id)}
            aria-current={acesa ? "true" : undefined}
            className={cn(
              "flex h-11 shrink-0 snap-start items-center justify-center rounded-full px-4 text-label font-medium whitespace-nowrap",
              "transition-colors duration-150 ease-quart",
              acesa
                ? "bg-brand-700 text-on-brand"
                : "border border-line-strong text-ink-muted hover:bg-sunken active:bg-sunken",
            )}
          >
            {ancora.rotulo}
          </a>
        );
      })}
    </nav>
  );
}
