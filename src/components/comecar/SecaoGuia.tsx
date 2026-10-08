import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * O ritmo das seções do guia que fica.
 *
 * Existe para que as quatro seções duráveis de `/comecar` — a cadeia do
 * dinheiro, o que mais tem aqui, o offline e a instalação — tenham o mesmo
 * título e o mesmo respiro, e **não** para dar superfície a elas: cada uma
 * escolhe o próprio recipiente, ou dispensa recipiente nenhum. Quatro caixas
 * iguais empilhadas seriam uma grade de cartões, que é o que o `DESIGN.md`
 * recusa.
 */
export function SecaoGuia({
  id,
  titulo,
  descricao,
  children,
  className,
}: {
  id: string;
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // O `id` é da seção, e não do título: é ela que o índice observa
    // (`#d295`), e a âncora para logo abaixo do cabeçalho grudento.
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={cn(
        "mt-8 scroll-mt-[calc(var(--fundo-cabecalho,0px)+1rem)] lg:mt-10",
        className,
      )}
    >
      <h2 id={`${id}-titulo`} className="text-heading font-semibold text-ink">
        {titulo}
      </h2>
      {descricao && (
        <p className="mt-1 max-w-[62ch] text-label text-ink-muted">
          {descricao}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}
