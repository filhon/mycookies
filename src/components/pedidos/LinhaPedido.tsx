import {
  Check,
  ChevronRight,
  Clock,
  HandCoins,
  Store,
  Truck,
  TriangleAlert,
} from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Marcador } from "@/components/ui/Selo";
import { SeloStatus } from "./SeloStatus";
import { formatarMoeda } from "@/lib/domain/money";
import { resumoDosItens } from "@/lib/domain/pedido";
import type { Pedido } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** "14:30", com o relógio. Também na agenda da tela Hoje. */
export function MarcadorHora({ hora }: { hora: string }) {
  return (
    <Marcador
      className="num"
      icone={<Clock aria-hidden className="size-3.5" strokeWidth={1.75} />}
    >
      {hora}
    </Marcador>
  );
}

/**
 * Um pedido na lista: para quem, o que é, quanto, e em que pé está.
 *
 * O total nunca aparece sozinho: embaixo dele vem o que sobra do pedido, que é
 * a pergunta que este sistema existe para responder. O status vai como texto e
 * ícone, e não como cor de linha.
 *
 * No que já saiu (`saiu`), a linha mostra só a exceção (`DECISOES.md#d248`):
 * "Entregue · Pago" repetido em trinta linhas escondia as duas que não
 * pagaram. Ali o selo só aparece no cancelado, e o não pago diz "Falta
 * receber". Na agenda tudo fica: o status é o que ela lê ali.
 */
export function LinhaPedido({
  pedido,
  saiu = false,
  aoAbrir,
}: {
  pedido: Pedido;
  saiu?: boolean;
  /** Tocar lê: abre a ficha do pedido (`#d249`). */
  aoAbrir: (pedido: Pedido) => void;
}) {
  const noPrejuizo = pedido.lucroEstimado < 0;
  const faltaReceber = saiu && pedido.status === "ENTREGUE" && !pedido.pago;

  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(pedido)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">
            {pedido.clienteNome}
          </p>

          <p className="num mt-0.5 truncate text-label text-ink-muted">
            {resumoDosItens(pedido.itens, 2, { soNome: true })}
          </p>

          {/* Uma pílula só, a do status. Pago e entrega são marcadores sem
              fundo: em 360px três pílulas quebravam em duas linhas de cor. */}
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {/* A hora abre a linha: é o que diz o que sai primeiro (`#d251`). */}
            {pedido.horaEntrega && <MarcadorHora hora={pedido.horaEntrega} />}
            {(!saiu || pedido.status === "CANCELADO") && (
              <SeloStatus status={pedido.status} />
            )}
            {/* Ícone e palavra, e não só o ocre: ele divide matiz com o âmbar. */}
            {faltaReceber && (
              <Marcador
                className="text-attention"
                icone={
                  <HandCoins
                    aria-hidden
                    className="size-3.5"
                    strokeWidth={1.75}
                  />
                }
              >
                Falta receber
              </Marcador>
            )}
            {/* O marcador de pago é o que separa a agenda do caixa: sem ele, "a
                receber" seria um número sem nenhuma linha que o explique. */}
            {!saiu && pedido.pago && (
              <Marcador
                icone={
                  <Check
                    aria-hidden
                    className="size-3.5 text-positive"
                    strokeWidth={2.5}
                  />
                }
              >
                Pago
              </Marcador>
            )}
            {/* Marcador, e não pílula, pela mesma razão do pago (spec 031). */}
            {pedido.origem === "CARDAPIO" && (
              <Marcador
                icone={
                  <Store aria-hidden className="size-3.5" strokeWidth={1.75} />
                }
              >
                Pelo cardápio
              </Marcador>
            )}
            {pedido.entrega.tipo === "ENTREGA" && (
              <Marcador
                icone={
                  <Truck aria-hidden className="size-3.5" strokeWidth={1.75} />
                }
              >
                Entrega
              </Marcador>
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
      </button>
    </li>
  );
}
