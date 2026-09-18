import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Ensina a tela em vez de anunciar a ausência. Uma frase sobre o que aquilo
 * resolve, e a ação para começar. Nunca "nenhum registro encontrado".
 *
 * A assinatura do estado vazio é o ponto do logotipo aplicado a uma frase:
 * quando o título termina em ponto final, o ponto vira o ponto âmbar, e o
 * leitor de tela continua lendo o ponto final. Título sem ponto (erro de
 * carga, filtro sem resultado) não ganha assinatura, e é de propósito.
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
  const assinado = titulo.endsWith(".");

  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-14 text-center",
        className,
      )}
    >
      <h3 className="font-display text-title font-semibold text-ink">
        {assinado ? (
          <>
            {titulo.slice(0, -1)}
            <span
              aria-hidden
              className="ml-[0.06em] inline-block size-2 rounded-full bg-accent-500"
            />
            <span className="sr-only">.</span>
          </>
        ) : (
          titulo
        )}
      </h3>
      <p className="mt-2 max-w-[38ch] text-body text-ink-muted">{descricao}</p>
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  );
}
