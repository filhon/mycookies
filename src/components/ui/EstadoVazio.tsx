import type { ReactNode } from "react";
import { Cookie } from "@/components/marca/Marca";
import { cn } from "@/lib/utils/cn";

/**
 * Ensina a tela em vez de anunciar a ausência. Uma frase sobre o que aquilo
 * resolve, e a ação para começar. Nunca "nenhum registro encontrado".
 */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center px-6 py-14 text-center",
        className,
      )}
    >
      <Cookie
        gotas={false}
        className="pointer-events-none absolute top-6 h-28 w-28 text-wine-700/8 dark:text-wine-300/10"
      />
      <div className="relative flex flex-col items-center">
        <h3 className="font-display text-title font-semibold text-ink">
          {titulo}
        </h3>
        <p className="mt-2 max-w-[38ch] text-body text-ink-muted">
          {descricao}
        </p>
        {acao && <div className="mt-6">{acao}</div>}
      </div>
    </div>
  );
}
