"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { contagemDoInsumo } from "@/lib/domain/estoque";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { formatarQuantidade } from "@/lib/domain/unidades";
import type { DataISO, Insumo } from "@/lib/types";

/**
 * O selo que era "Estoque baixo" e nunca pôde acender.
 *
 * Ele dependia de um limiar por insumo que nenhuma tela escrevia — vinte
 * palpites a manter, cada um envelhecendo do mesmo jeito que o estoque
 * envelhecia. O que ficou no lugar é uma afirmação verificável sobre um número
 * que existe: esta contagem passou de um mês.
 */
export function LinhaInsumo({
  insumo,
  hoje,
  aoAbrir,
}: {
  insumo: Insumo;
  hoje: DataISO;
  aoAbrir: (insumo: Insumo) => void;
}) {
  // `contagemDoInsumo`, e não `frescorDaContagem` direto: é ele que sabe que
  // data sem número não é contagem, e que `null` no documento é ausência.
  const contagemVencida = contagemDoInsumo(insumo, hoje).frescor === "VENCIDA";

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

          {contagemVencida && (
            <Selo
              tom="atencao"
              className="mt-1.5"
              icone={<TriangleAlert aria-hidden className="size-3.5" />}
            >
              Contagem vencida
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
