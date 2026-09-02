import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Uma seção do editor de ficha.
 *
 * Parece o bloco da configuração e não é ele: aquele existe para carregar a
 * frase de consequência embaixo de campos de digitação, enquanto este precisa
 * deixar uma lista de itens sangrar até a borda e viver sem rodapé. Quando
 * houver um terceiro caso, os dois viram um primitivo em `components/ui`.
 */
export function BlocoFicha({
  icone: Icone,
  titulo,
  descricao,
  acao,
  children,
  recuado = true,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: ReactNode;
  /** Ação de cabeçalho, como o seletor de tipo. */
  acao?: ReactNode;
  children: ReactNode;
  /** Falso quando o conteúdo é lista que precisa ir até a borda. */
  recuado?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface",
        className,
      )}
    >
      <div className="px-4 py-5 lg:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Icone
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-ink-muted"
              strokeWidth={1.75}
            />
            <div className="min-w-0">
              <h2 className="text-subheading font-semibold text-ink">
                {titulo}
              </h2>
              {descricao && (
                <p className="mt-1 max-w-[56ch] text-label text-ink-muted">
                  {descricao}
                </p>
              )}
            </div>
          </div>
          {acao && <div className="shrink-0">{acao}</div>}
        </div>

        <div className={cn("mt-4 space-y-4", recuado && "lg:ml-8")}>
          {children}
        </div>
      </div>
    </section>
  );
}
