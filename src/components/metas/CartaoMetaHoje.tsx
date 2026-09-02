"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Target } from "lucide-react";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { competenciaAtual, rotuloMes } from "@/lib/domain/datas";
import { esforcoRestante, ritmoDoEspelho } from "@/lib/domain/metas";
import { formatarMoeda } from "@/lib/domain/money";
import { docResumoMensal } from "@/lib/firebase/colecoes";
import { useDocumento } from "@/lib/hooks/useColecao";
import type { ResumoMensal } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/**
 * O número que ela persegue, na tela que abre de manhã.
 *
 * Sai de uma leitura só: o espelho da meta mora dentro do agregado do mês
 * (`DECISOES.md#d09`), então este cartão não consulta a coleção de metas nem a
 * de lançamentos. O que depende do calendário é refeito aqui, na leitura, para
 * que o esforço nunca apareça menor do que é (`ritmoDoEspelho`).
 */
export function CartaoMetaHoje() {
  const contaId = useContaId();
  const [agora] = useState(() => new Date());
  const [competencia] = useState(() => competenciaAtual(agora));

  const referencia = useMemo(
    () => docResumoMensal(contaId, competencia),
    [contaId, competencia],
  );
  const resumo = useDocumento<ResumoMensal>(referencia);

  if (resumo.carregando) {
    return <Esqueleto className="h-28 rounded-lg" />;
  }

  const mes = rotuloMes(competencia);
  const espelho = resumo.dado?.meta;

  if (!espelho) {
    return (
      <Cartao>
        <Cabecalho mes={mes} />
        <p className="mt-1 max-w-[46ch] text-label text-ink-muted">
          Diga quanto quer faturar em {mes} e este cartão passa a mostrar
          quantos doces por semana faltam.
        </p>
      </Cartao>
    );
  }

  const ritmo = ritmoDoEspelho(espelho, competencia, agora);

  if (ritmo.batida) {
    return (
      <Cartao dourado>
        <Cabecalho mes={mes} />
        <p className="mt-2 flex items-center gap-2 font-display text-title font-semibold text-ink">
          <Check
            aria-hidden
            className="size-6 shrink-0 text-gold-600 dark:text-gold-500"
            strokeWidth={2.25}
          />
          Meta batida
        </p>
        <p className="num mt-1 text-label text-ink-muted">
          {formatarMoeda(espelho.realizado)} de{" "}
          {formatarMoeda(espelho.faturamentoAlvo)}.
        </p>
      </Cartao>
    );
  }

  const esforco = esforcoRestante(
    espelho.unidadesRestantes,
    ritmo.unidadesPorSemanaRestante,
    ritmo.diasRestantes,
  );

  return (
    <Cartao>
      <Cabecalho mes={mes} />
      <p className="num mt-2 font-display text-display font-semibold text-ink">
        {esforco.unidades}
        <span className="ml-2 font-sans text-body font-medium text-ink-muted">
          {esforco.prazo === "SEMANA"
            ? "doces por semana"
            : "doces até o fim do mês"}
        </span>
      </p>
      <p className="mt-1 max-w-[46ch] text-label text-ink-muted">
        É o que falta para chegar aos{" "}
        <span className="num font-semibold text-ink">
          {formatarMoeda(espelho.faturamentoAlvo)}
        </span>{" "}
        de {mes}.
      </p>
    </Cartao>
  );
}

/**
 * O cartão inteiro é o alvo de toque: um cartão com um link dentro faria a
 * usuária mirar em uma palavra, em pé e com uma mão só.
 */
function Cartao({
  children,
  dourado = false,
}: {
  children: React.ReactNode;
  dourado?: boolean;
}) {
  return (
    <Link
      href="/financeiro"
      className={cn(
        "group block rounded-lg border border-line bg-surface px-5 py-4",
        "transition-colors duration-150 ease-quart hover:bg-sunken",
        dourado && "filete-dourado",
      )}
    >
      {children}
    </Link>
  );
}

function Cabecalho({ mes }: { mes: string }) {
  return (
    <span className="flex items-center gap-2 text-label font-medium text-ink-muted">
      <Target aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      Meta de {mes}
      <ChevronRight
        aria-hidden
        className="ml-auto size-4 shrink-0 text-ink-subtle"
        strokeWidth={1.75}
      />
    </span>
  );
}
