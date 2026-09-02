"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { BASE_CONTROLE } from "@/components/ui/Campo";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Selo } from "@/components/ui/Selo";
import { formatarValor } from "@/lib/domain/money";
import type { Centavos, UnidadeCompra } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const CLASSES_QUANTIDADE = cn(
  BASE_CONTROLE,
  "num w-24 text-right font-semibold border-line-strong",
);

/**
 * O esqueleto comum das duas listas do editor: nome em cima, quantidade e
 * custo da linha embaixo, e o botão de remover sempre no mesmo lugar.
 *
 * Linha com divisória, e não cartão: isto é uma tabela de receita, e cartão
 * dentro de cartão seria a segunda caixa em volta do mesmo dado.
 */
function Linha({
  nome,
  etiqueta,
  controles,
  custoLinha,
  aoRemover,
  rotuloRemover,
  erro,
}: {
  nome: string;
  etiqueta?: ReactNode;
  controles: ReactNode;
  custoLinha: Centavos;
  aoRemover: () => void;
  rotuloRemover: string;
  erro?: string;
}) {
  return (
    <li className="px-4 py-3 lg:px-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-body font-medium text-ink">
              {nome}
            </span>
            {etiqueta}
          </p>

          <div className="mt-2 flex items-center gap-2">
            {controles}
            <span className="ml-auto text-right">
              <Dinheiro centavos={custoLinha} />
            </span>
          </div>

          {erro && (
            <p role="alert" className="mt-1.5 text-label text-negative">
              {erro}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={aoRemover}
          aria-label={rotuloRemover}
          className="toque -mr-2 flex shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 ease-quart hover:bg-negative-soft hover:text-negative"
        >
          <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}

export function LinhaItemFicha({
  nome,
  ehEmbalagem,
  unidades,
  custoLinha,
  campoQuantidade,
  campoUnidade,
  aoRemover,
  erro,
}: {
  nome: string;
  ehEmbalagem: boolean;
  /** Só as unidades compatíveis com a unidade base do insumo. */
  unidades: UnidadeCompra[];
  custoLinha: Centavos;
  campoQuantidade: UseFormRegisterReturn;
  campoUnidade: UseFormRegisterReturn;
  aoRemover: () => void;
  erro?: string;
}) {
  const unica = unidades[0];

  return (
    <Linha
      nome={nome}
      etiqueta={ehEmbalagem ? <Selo tom="neutro">Embalagem</Selo> : undefined}
      custoLinha={custoLinha}
      aoRemover={aoRemover}
      rotuloRemover={`Tirar ${nome} da ficha`}
      erro={erro}
      controles={
        <>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={`Quantidade de ${nome}`}
            aria-invalid={erro ? true : undefined}
            className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
            {...campoQuantidade}
          />

          {/* Uma unidade só não é escolha: vira rótulo, e o toque sobra para
              quem precisa dele. */}
          {unidades.length === 1 && unica ? (
            <span className="text-label text-ink-muted">{unica}</span>
          ) : (
            <select
              aria-label={`Unidade de ${nome}`}
              className={cn(BASE_CONTROLE, "w-20 border-line-strong px-2")}
              {...campoUnidade}
            >
              {unidades.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
          )}
        </>
      }
    />
  );
}

export function LinhaComponenteFicha({
  nome,
  custoUnitario,
  custoLinha,
  campoQuantidade,
  aoRemover,
  erro,
}: {
  nome: string;
  custoUnitario: Centavos;
  custoLinha: Centavos;
  campoQuantidade: UseFormRegisterReturn;
  aoRemover: () => void;
  erro?: string;
}) {
  return (
    <Linha
      nome={nome}
      custoLinha={custoLinha}
      aoRemover={aoRemover}
      rotuloRemover={`Tirar ${nome} do kit`}
      erro={erro}
      controles={
        <>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Quantidade de ${nome} no kit`}
            aria-invalid={erro ? true : undefined}
            className={cn(CLASSES_QUANTIDADE, erro && "border-negative")}
            {...campoQuantidade}
          />
          <span className="num text-label text-ink-muted">
            × {formatarValor(custoUnitario)}
          </span>
        </>
      }
    />
  );
}
