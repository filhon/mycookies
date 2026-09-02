"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { competenciaVizinha, rotuloCompetencia } from "@/lib/domain/datas";
import type { CompetenciaMensal } from "@/lib/types";

/**
 * O mês que o painel inteiro está mostrando.
 *
 * Setas grandes dos dois lados e o nome do mês no meio: é a navegação que
 * funciona com uma mão só, em pé, que é onde a Maynara confere o caixa. O mês
 * corrente é o padrão, e voltar para ele é um toque explícito — nunca uma seta
 * que ela precise contar quantas vezes tocar.
 */
export function SeletorMes({
  competencia,
  mesCorrente,
  aoMudar,
}: {
  competencia: CompetenciaMensal;
  mesCorrente: CompetenciaMensal;
  aoMudar: (competencia: CompetenciaMensal) => void;
}) {
  const noMesCorrente = competencia === mesCorrente;

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => aoMudar(competenciaVizinha(competencia, -1))}
          aria-label={`Ver ${rotuloCompetencia(competenciaVizinha(competencia, -1))}`}
          className="toque flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
        </button>

        <p
          aria-live="polite"
          className="flex-1 text-center font-display text-heading font-semibold text-ink first-letter:uppercase lg:text-title"
        >
          {rotuloCompetencia(competencia)}
        </p>

        <button
          type="button"
          onClick={() => aoMudar(competenciaVizinha(competencia, 1))}
          aria-label={`Ver ${rotuloCompetencia(competenciaVizinha(competencia, 1))}`}
          className="toque flex items-center justify-center rounded-md text-ink-muted transition-colors duration-150 ease-quart hover:bg-sunken hover:text-ink"
        >
          <ChevronRight aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {!noMesCorrente && (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            onClick={() => aoMudar(mesCorrente)}
            className="toque rounded-md px-3 text-label font-medium text-wine-700 underline underline-offset-2 transition-colors duration-150 ease-quart hover:bg-wine-100 dark:text-wine-300"
          >
            Voltar para {rotuloCompetencia(mesCorrente)}
          </button>
        </div>
      )}
    </div>
  );
}
