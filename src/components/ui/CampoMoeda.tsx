"use client";

import { useId, type ReactNode } from "react";
import { digitosParaCentavos, formatarValor } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export interface CampoMoedaProps {
  rotulo: string;
  valor: Centavos;
  aoMudar: (centavos: Centavos) => void;
  dica?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
  desabilitado?: boolean;
  className?: string;
}

/**
 * Cada dígito digitado empurra o valor uma casa à esquerda, como no aplicativo
 * do banco. Não existe vírgula para errar, e o teclado numérico do celular
 * basta: a Maynara digita isso com farinha no dedo.
 */
export function CampoMoeda({
  rotulo,
  valor,
  aoMudar,
  dica,
  erro,
  obrigatorio,
  desabilitado,
  className,
}: CampoMoedaProps) {
  const id = useId();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {rotulo}
        {obrigatorio && (
          <span className="ml-1 text-ink-subtle" aria-hidden>
            *
          </span>
        )}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-label font-medium text-ink-muted">
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={desabilitado}
          value={formatarValor(valor)}
          onChange={(evento) =>
            aoMudar(digitosParaCentavos(evento.target.value))
          }
          onFocus={(evento) => evento.currentTarget.select()}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            erro ? `${id}-erro` : dica ? `${id}-dica` : undefined
          }
          className={cn(
            "num h-12 w-full rounded-md border bg-surface pl-10 pr-3 text-right",
            "text-body font-semibold text-ink transition-colors duration-150 ease-quart",
            "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted",
            erro ? "border-negative" : "border-line-strong",
          )}
        />
      </div>

      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-label text-negative">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-label text-ink-muted">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
