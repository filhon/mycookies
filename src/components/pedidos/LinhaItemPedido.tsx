"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import { formatarMoeda, formatarValor } from "@/lib/domain/money";
import type { Centavos } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const CLASSES_QUANTIDADE = cn(
  BASE_CONTROLE,
  "num w-24 text-right font-semibold border-line-strong",
);

/**
 * Uma linha do pedido: o produto, quantos, por quanto cada, e o que dá a linha.
 *
 * O preço ao lado da quantidade é o congelado, e não o da ficha de hoje. Quando
 * os dois divergem — e só enquanto o pedido é orçamento — a linha mostra o
 * preço de agora e oferece trocá-lo. O sistema mostra e oferece; quem
 * reprecifica é ela (`DECISOES.md#d21`).
 */
export function LinhaItemPedido({
  nome,
  quantidade,
  precoUnitario,
  subtotal,
  precoDeHoje,
  aoMudarQuantidade,
  aoUsarPrecoDeHoje,
  aoRemover,
  erro,
}: {
  nome: string;
  quantidade: string;
  precoUnitario: Centavos;
  subtotal: Centavos;
  /** Só vem preenchido quando o selo deve aparecer. */
  precoDeHoje?: Centavos;
  aoMudarQuantidade: (valor: string) => void;
  aoUsarPrecoDeHoje: () => void;
  aoRemover: () => void;
  erro?: string;
}) {
  return (
    <li className="px-4 py-3 lg:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">{nome}</p>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={quantidade}
              onChange={(evento) => aoMudarQuantidade(evento.target.value)}
              aria-label={`Quantidade de ${nome}`}
              aria-invalid={erro ? true : undefined}
              className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
            />
            <span className="num text-label text-ink-muted">
              × {formatarValor(precoUnitario)}
            </span>
            <span className="ml-auto text-right">
              <Dinheiro centavos={subtotal} />
            </span>
          </div>

          {precoDeHoje !== undefined && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Selo
                tom="atencao"
                icone={<RefreshCw aria-hidden className="size-3.5" />}
              >
                Hoje esta ficha sai por {formatarMoeda(precoDeHoje)}
              </Selo>
              <button
                type="button"
                onClick={aoUsarPrecoDeHoje}
                className="toque -my-2 inline-flex items-center rounded-md px-2 text-label font-medium text-wine-700 transition-colors duration-150 ease-quart hover:bg-wine-100 dark:text-wine-300"
              >
                Usar o preço de hoje
              </button>
            </div>
          )}

          {erro && (
            <p role="alert" className="mt-1.5 text-label text-negative">
              {erro}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={aoRemover}
          aria-label={`Tirar ${nome} do pedido`}
          className="toque -mr-2 flex shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 ease-quart hover:bg-negative-soft hover:text-negative"
        >
          <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}
