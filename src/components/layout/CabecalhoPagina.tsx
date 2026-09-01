import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function CabecalhoPagina({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  /** Filtros, busca ou resumo que acompanham o título. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 border-b border-line bg-canvas px-4 pb-3 pt-4 lg:-mx-8 lg:px-8 lg:pb-5 lg:pt-8",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-title font-semibold text-ink lg:text-display">
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-1 max-w-[52ch] text-label text-ink-muted lg:text-body">
              {descricao}
            </p>
          )}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}
