import { Check } from "lucide-react";
import { FLUXO_PEDIDO, ROTULO_STATUS_PEDIDO } from "@/lib/domain/pedido";
import type { StatusPedido } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { SeloStatus } from "./SeloStatus";

/**
 * Onde o pedido está no caminho do orçamento à entrega (`#d272`).
 *
 * No `lg`, os cinco passos em fila: o feito com `Check`, o atual com o selo,
 * o de depois apagado. No celular a fila não cabe em 360px: o selo, "passo 2
 * de 5" e cinco traços, que o leitor de tela pula porque a linha já disse.
 * Cancelado não está na fila: quem chama mostra o selo no lugar.
 */
export function TrilhaDoPedido({ status }: { status: StatusPedido }) {
  const atual = FLUXO_PEDIDO.indexOf(status);

  return (
    <div>
      <p className="lg:hidden">
        <span className="sr-only">
          Passo {atual + 1} de {FLUXO_PEDIDO.length},{" "}
          {ROTULO_STATUS_PEDIDO[status]}
        </span>
        <span aria-hidden className="flex items-center gap-2.5">
          <SeloStatus status={status} />
          <span className="num text-label text-ink-muted">
            passo {atual + 1} de {FLUXO_PEDIDO.length}
          </span>
        </span>
      </p>
      <div aria-hidden className="mt-2.5 flex gap-1 lg:hidden">
        {FLUXO_PEDIDO.map((passo, indice) => (
          <span
            key={passo}
            className={cn(
              "h-1 flex-1 rounded-full",
              indice <= atual ? "bg-brand-ink" : "bg-sunken",
            )}
          />
        ))}
      </div>

      <ol
        aria-label="Caminho do pedido"
        className="hidden flex-wrap items-center gap-x-2 gap-y-2 lg:flex"
      >
        {FLUXO_PEDIDO.map((passo, indice) => (
          <li
            key={passo}
            aria-current={indice === atual ? "step" : undefined}
            className="flex items-center gap-2"
          >
            {indice > 0 && (
              <span aria-hidden className="h-px w-6 bg-line-strong" />
            )}
            {indice < atual ? (
              <span className="inline-flex items-center gap-1.5 text-label text-ink-muted">
                <Check
                  aria-hidden
                  className="size-4 text-brand-ink"
                  strokeWidth={2}
                />
                {ROTULO_STATUS_PEDIDO[passo]}
              </span>
            ) : indice === atual ? (
              <SeloStatus status={passo} />
            ) : (
              <span className="text-label text-ink-subtle">
                {ROTULO_STATUS_PEDIDO[passo]}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
