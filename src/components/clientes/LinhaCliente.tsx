"use client";

import { ChevronRight, MessageCircle } from "lucide-react";
import { classesBotao } from "@/components/ui/estilosBotao";
import { resumoDaCliente } from "@/lib/domain/clientes";
import { dataISODe } from "@/lib/domain/datas";
import { formatarMoeda } from "@/lib/domain/money";
import {
  linkDoWhatsApp,
  mensagemDeVolta,
  primeiroNome,
  telefoneParaWhatsApp,
} from "@/lib/domain/whatsapp";
import type { Cliente } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A linha da cliente, três andares: nome e gasto em cima, o resumo do que ela
 * pagou no meio, e o contato — quando há algum — embaixo. `resumoDaCliente`
 * é quem decide se ela nunca pagou um pedido.
 *
 * Em Sumiram e Uma vez só (`#d309`), `parada` troca "último em …" por "há N
 * dias" e põe "Chamar" ao lado do botão da linha, nunca dentro dele, só com
 * telefone que disca.
 */
export function LinhaCliente({
  cliente,
  aoAbrir,
  parada,
}: {
  cliente: Cliente;
  aoAbrir: (cliente: Cliente) => void;
  parada?: { dias: number | null; negocio: string };
}) {
  const ultimoISO = cliente.ultimoPedidoEm
    ? dataISODe(cliente.ultimoPedidoEm.toDate())
    : null;
  const resumo = parada
    ? [
        resumoDaCliente(cliente, null),
        ...(parada.dias != null ? [`há ${parada.dias} dias`] : []),
      ].join(" · ")
    : resumoDaCliente(cliente, ultimoISO);
  const numero = parada ? telefoneParaWhatsApp(cliente.telefone) : null;
  const contato = [cliente.telefone, cliente.instagram]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={() => aoAbrir(cliente)}
        className="block min-w-0 flex-1 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
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
      {numero && parada && (
        // Um `<a>`, e não `window.open` (`#d77`): o texto vai pronto e não
        // é enviado.
        <a
          href={linkDoWhatsApp(
            numero,
            mensagemDeVolta({
              primeiroNome: primeiroNome(cliente.nome),
              negocio: parada.negocio,
            }),
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chamar ${cliente.nome} no WhatsApp`}
          className={classesBotao({
            tamanho: "sm",
            className: "mr-4 shrink-0",
          })}
        >
          <MessageCircle aria-hidden className="size-4" strokeWidth={1.75} />
          Chamar
        </a>
      )}
    </li>
  );
}
