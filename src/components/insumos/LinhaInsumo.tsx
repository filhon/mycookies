"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { temPrecoMedio } from "@/lib/domain/biblioteca";
import { contagemDoInsumo, rotuloDeIdade } from "@/lib/domain/estoque";
import { formatarCustoUnitario, formatarMoeda } from "@/lib/domain/money";
import { projecaoDoInsumo } from "@/lib/domain/producao";
import { formatarQuantidade } from "@/lib/domain/unidades";
import type { DataISO, Fornada, Insumo } from "@/lib/types";

/**
 * A linha do insumo, com o que a despensa tem e desde quando.
 *
 * O selo era "Estoque baixo" e nunca pôde acender: dependia de um limiar por
 * insumo que nenhuma tela escrevia — vinte palpites a manter, cada um
 * envelhecendo do mesmo jeito que o estoque envelhecia. O que ficou no lugar é
 * uma afirmação verificável sobre um número que existe: esta contagem passou de
 * um mês, e a lista de compras parou de descontá-la.
 */
export function LinhaInsumo({
  insumo,
  fornadas,
  hoje,
  aoAbrir,
}: {
  insumo: Insumo;
  /** As fornadas recentes, para a linha dizer o que o forno já levou. */
  fornadas: Fornada[];
  hoje: DataISO;
  aoAbrir: (insumo: Insumo) => void;
}) {
  // `contagemDoInsumo`, e não `frescorDaContagem` direto: é ele que sabe que
  // data sem número não é contagem, e que `null` no documento é ausência.
  const contagem = contagemDoInsumo(insumo, hoje);
  const contagemVencida = contagem.frescor === "VENCIDA";

  // A projeção só vale a frase quando o forno mexeu num número que ainda vale:
  // a contagem gravada não muda, e a linha diz os dois (`#d87`).
  const projecao = projecaoDoInsumo(fornadas, insumo, hoje);
  const comForno = projecao.fornadas > 0 && contagem.quantidade !== null;

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

          {/* A despensa, e desde quando. Sem a idade o número é um palpite
              antigo tratado como verdade — que é exatamente o que a lista de
              compras deixou de fazer. */}
          <p className="num mt-0.5 truncate text-label text-ink-subtle">
            {contagem.anotado === null
              ? "nunca contada"
              : `${formatarQuantidade(contagem.anotado, insumo.unidadeBase)} na despensa · ${rotuloDeIdade(contagem)}`}
          </p>

          {comForno && (
            <p className="num mt-0.5 text-label text-ink-subtle">
              {projecao.fornadas === 1
                ? "1 fornada desde então"
                : `${projecao.fornadas} fornadas desde então`}
              <span className="mx-1.5">·</span>
              projetamos{" "}
              {formatarQuantidade(projecao.disponivel, insumo.unidadeBase)}
            </p>
          )}

          {(contagemVencida || temPrecoMedio(insumo)) && (
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {contagemVencida && (
                <Selo
                  tom="atencao"
                  icone={<TriangleAlert aria-hidden className="size-3.5" />}
                >
                  Contagem vencida
                </Selo>
              )}
              {temPrecoMedio(insumo) && <Selo tom="neutro">Preço médio</Selo>}
            </p>
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
