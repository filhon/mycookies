"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { formatarQuantidade } from "@/lib/domain/unidades";
import type { Insumo } from "@/lib/types";

function estoqueBaixo(insumo: Insumo): boolean {
  return (
    insumo.estoqueAtual !== undefined &&
    insumo.estoqueMinimo !== undefined &&
    insumo.estoqueAtual <= insumo.estoqueMinimo
  );
}

export function LinhaInsumo({
  insumo,
  aoAbrir,
}: {
  insumo: Insumo;
  aoAbrir: (insumo: Insumo) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => aoAbrir(insumo)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">
            {insumo.nome}
          </p>

          <p className="num mt-0.5 truncate text-label text-ink-muted">
            {formatarMoeda(insumo.precoCompra)}
            <span className="mx-1.5 text-ink-subtle">·</span>
            {formatarQuantidade(insumo.quantidadeBase, insumo.unidadeBase)}
            {insumo.perdaPercentual > 0 && (
              <>
                <span className="mx-1.5 text-ink-subtle">·</span>
                {insumo.perdaPercentual}% de perda
              </>
            )}
          </p>

          {estoqueBaixo(insumo) && (
            <Selo
              tom="atencao"
              className="mt-1.5"
              icone={<TriangleAlert aria-hidden className="size-3.5" />}
            >
              Estoque baixo
            </Selo>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="num text-body font-semibold text-ink">
            {formatarCustoUnitario(insumo.custoUnidadeBaseCorrigido)}
          </p>
          <p className="text-micro text-ink-muted">por {insumo.unidadeBase}</p>
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
