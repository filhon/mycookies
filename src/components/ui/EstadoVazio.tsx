import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Ensina a tela em vez de anunciar a ausência. Uma frase sobre o que aquilo
 * resolve, e a ação para começar. Nunca "nenhum registro encontrado".
 * Sem marca d'água: a assinatura do estado vazio é a sessão C da spec 033.
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
        "flex flex-col items-center px-6 py-14 text-center",
        className,
      )}
    >
      <h3 className="font-display text-title font-semibold text-ink">
        {titulo}
      </h3>
      <p className="mt-2 max-w-[38ch] text-body text-ink-muted">{descricao}</p>
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  );
}
