"use client";

import { ChevronRight } from "lucide-react";
import { resumoDaCliente } from "@/lib/domain/clientes";
import { dataISODe } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import type { Cliente } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A linha da cliente, três andares: nome e gasto em cima, o resumo do que ela
 * pagou no meio, e o contato — quando há algum — embaixo. `resumoDaCliente`
 * é quem decide se ela nunca pagou um pedido.
 */
export function LinhaCliente({
  cliente,
  aoAbrir,
}: {
  cliente: Cliente;
  aoAbrir: (cliente: Cliente) => void;
}) {
  const ultimoISO = cliente.ultimoPedidoEm
    ? dataISODe(cliente.ultimoPedidoEm.toDate())
    : null;
  const resumo = resumoDaCliente(cliente, ultimoISO);
  const contato = [cliente.telefone, cliente.instagram]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(cliente)}
        className="block w-full px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
            {cliente.nome}
          </p>
          <p className="num shrink-0 text-body font-semibold text-ink">
            {formatarMoeda(cliente.totalGasto)}
          </p>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-subtle"
            strokeWidth={1.75}
          />
        </div>

        <p
          className={cn(
            "num mt-0.5 pr-8 text-label",
            cliente.totalPedidos > 0 ? "text-ink-muted" : "text-ink-subtle",
          )}
        >
          {resumo}
        </p>

        {contato && (
          <p className="mt-2 truncate pr-8 text-label text-ink-subtle">
            {contato}
          </p>
        )}
      </button>
    </li>
  );
}
