import Link from "next/link";
import { Check, ChevronRight, Truck, TriangleAlert } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import { SeloStatus } from "./SeloStatus";
import { formatarMoeda } from "@/lib/domain/money";
import { resumoDosItens } from "@/lib/domain/pedido";
import type { Pedido } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Um pedido na lista: para quem, o que é, quanto, e em que pé está.
 *
 * O total nunca aparece sozinho: embaixo dele vem o que sobra do pedido, que é
 * a pergunta que este sistema existe para responder. O status vai como texto e
 * ícone, e não como cor de linha.
 */
export function LinhaPedido({ pedido }: { pedido: Pedido }) {
  const noPrejuizo = pedido.lucroEstimado < 0;

  return (
    <li>
      <Link
        href={`/pedidos/${pedido.id}`}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">
            {pedido.clienteNome}
          </p>

          <p className="num mt-0.5 truncate text-label text-ink-muted">
            {resumoDosItens(pedido.itens)}
          </p>

          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SeloStatus status={pedido.status} />
            {/* O selo de pago é o que separa a agenda do caixa: sem ele, "a
                receber" seria um número sem nenhuma linha que o explique. */}
            {pedido.pago && (
              <Selo
                tom="positivo"
                icone={
                  <Check aria-hidden className="size-3.5" strokeWidth={2} />
                }
              >
                Pago
              </Selo>
            )}
            {pedido.entrega.tipo === "ENTREGA" && (
              <Selo
                tom="neutro"
                icone={<Truck aria-hidden className="size-3.5" />}
              >
                Entrega
              </Selo>
            )}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <Dinheiro centavos={pedido.total} />
          <p
            className={cn(
              "num mt-0.5 flex items-center justify-end gap-1 text-micro",
              noPrejuizo ? "text-negative" : "text-ink-muted",
            )}
          >
            {noPrejuizo && (
              <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2} />
            )}
            {noPrejuizo
              ? `perde ${formatarMoeda(Math.abs(pedido.lucroEstimado))}`
              : `sobram ${formatarMoeda(pedido.lucroEstimado)}`}
          </p>
        </div>

        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
      </Link>
    </li>
  );
}
