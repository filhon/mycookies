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
    <section aria-labelledby={id} className={cn("mt-8 lg:mt-10", className)}>
      <h2 id={id} className="text-heading font-semibold text-ink">
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
