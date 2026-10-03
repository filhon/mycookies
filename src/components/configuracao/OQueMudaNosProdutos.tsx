"use client";

import Link from "next/link";
import { orderBy, query, where } from "firebase/firestore";
import { useId, useMemo, useState } from "react";
import { Check, TrendingDown } from "lucide-react";
import { fraseSetaSobra } from "@/components/fichas/LinhaFicha";
import {
  refazerCustoPelaConfiguracao,
  type RateioOperacional,
} from "@/lib/domain/custoFicha";
import { formatarMoeda } from "@/lib/domain/money";
import { colFichas } from "@/lib/firebase/colecoes";
import { useColecao } from "@/lib/hooks/useColecao";
import type { FichaTecnica } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/** O que `refazerFichasPelaConfiguracao` devolveu: o recibo do salvar. */
export interface ReciboDosProdutos {
  refeitas: number;
  kits: number;
}

/** Quantas linhas a prévia mostra antes do "e mais". */
const LINHAS_DE_SAIDA = 5;

interface Mudanca {
  id: string;
  nome: string;
  /** Custo por unidade, novo menos gravado. */
  custo: number;
  antes: number;
  depois: number;
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "14 produtos ficam mais caros de fazer: de R$ 0,12 a R$ 0,48 por unidade." */
function fraseDoGrupo(custos: number[], caro: boolean): string {
  const n = custos.length;
  const menor = Math.min(...custos);
  const maior = Math.max(...custos);
  const faixa =
    menor === maior
      ? formatarMoeda(menor)
      : `de ${formatarMoeda(menor)} a ${formatarMoeda(maior)}`;
  const comparativo = caro
    ? n === 1
      ? "mais caro"
      : "mais caros"
    : n === 1
      ? "mais barato"
      : "mais baratos";
  return `${plural(n, "produto fica", "produtos ficam")} ${comparativo} de fazer: ${faixa} por unidade.`;
}

/**
 * "O que muda nos seus produtos" (`#d282`): enquanto o rateio da tela difere do
 * gravado, cada receita refeita pela mesma conta do salvar
 * (`refazerCustoPelaConfiguracao`), contra o que ela gravou. Depois de salvar,
 * no mesmo lugar, o recibo. Assina a consulta de `/fichas`, que o cache já tem.
 *
 * Sem `aria-live`, como a faixa dos blocos: a prévia muda a cada tecla. O
 * recibo é `status`, porque chega uma vez.
 */
export function OQueMudaNosProdutos({
  rateio,
  recibo,
}: {
  /** O rateio da tela, só quando ele difere do gravado. */
  rateio: RateioOperacional | null;
  recibo: ReciboDosProdutos | null;
}) {
  const contaId = useContaId();
  const idTitulo = useId();
  const [abertas, setAbertas] = useState(false);

  const consulta = useMemo(
    () =>
      query(
        colFichas(contaId),
        where("arquivado", "==", false),
        orderBy("nomeBusca"),
      ),
    [contaId],
  );
  const { dados } = useColecao<FichaTecnica>(consulta);

  if (!rateio) {
    if (!recibo || recibo.refeitas + recibo.kits === 0) return null;
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 px-1 text-label text-ink-muted"
      >
        <Check
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-positive"
          strokeWidth={2}
        />
        <p>
          {recibo.refeitas > 0 &&
            `${plural(recibo.refeitas, "produto refeito", "produtos refeitos")} com os números novos. `}
          {recibo.kits > 0 &&
            `${plural(recibo.kits, "kit ficou", "kits ficaram")} para conferir. `}
          <Link
            href="/fichas"
            className="inline-flex min-h-11 items-center font-medium text-brand-ink underline underline-offset-2"
          >
            Ver os produtos
          </Link>
        </p>
      </div>
    );
  }

  let kits = 0;
  const mudancas: Mudanca[] = [];
  for (const ficha of dados) {
    if (ficha.tipo === "KIT") {
      kits += 1;
      continue;
    }
    const nova = refazerCustoPelaConfiguracao(ficha, rateio);
    const custo = nova.custoUnitario - ficha.custoUnitario;
    if (custo === 0) continue;
    mudancas.push({
      id: ficha.id,
      nome: ficha.nome,
      custo,
      antes: ficha.precificacao.lucroUnitario,
      depois: nova.precificacao.lucroUnitario,
    });
  }
  if (mudancas.length === 0 && kits === 0) return null;

  // A maior queda na sobra primeiro.
  mudancas.sort((a, b) => a.depois - a.antes - (b.depois - b.antes));

  const caros = mudancas.filter((m) => m.custo > 0).map((m) => m.custo);
  const baratos = mudancas.filter((m) => m.custo < 0).map((m) => -m.custo);
  const frases = [
    caros.length > 0 && fraseDoGrupo(caros, true),
    baratos.length > 0 && fraseDoGrupo(baratos, false),
  ].filter(Boolean);

  const visiveis = abertas ? mudancas : mudancas.slice(0, LINHAS_DE_SAIDA);
  const resto = mudancas.length - visiveis.length;

  return (
    <section aria-labelledby={idTitulo} className="pt-2">
      <h2 id={idTitulo} className="text-subheading font-semibold text-ink">
        O que muda nos seus produtos
      </h2>
      {frases.length > 0 && (
        <p className="mt-1 max-w-[60ch] text-label text-ink-muted">
          Com estes números, {frases.join(" ")}
        </p>
      )}

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {visiveis.map((m) => {
          const prejuizo = m.depois < 0;
          return (
            <li
              key={m.id}
              className="flex min-h-11 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 lg:px-5"
            >
              <span className="min-w-0 truncate text-body font-medium text-ink">
                {m.nome}
              </span>
              {/* No prejuízo, ícone e palavra junto da cor: a cor nunca decide sozinha. */}
              <span
                className={cn(
                  "num flex items-center gap-1.5 text-label",
                  prejuizo ? "text-negative" : "text-ink-muted",
                )}
              >
                {prejuizo && (
                  <TrendingDown
                    aria-hidden
                    className="size-4 shrink-0"
                    strokeWidth={2}
                  />
                )}
                {fraseSetaSobra(m.antes, m.depois)}
                {prejuizo && m.antes >= 0 && ", passa a dar prejuízo"}
              </span>
            </li>
          );
        })}

        {resto > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setAbertas(true)}
              className="flex min-h-11 w-full items-center px-4 text-left text-label font-medium text-brand-ink transition-colors duration-150 ease-quart hover:bg-brand-100 lg:px-5"
            >
              e mais {resto}
            </button>
          </li>
        )}

        {kits > 0 && (
          <li className="flex min-h-11 items-center px-4 py-3 text-label text-ink-muted lg:px-5">
            {plural(kits, "kit fica", "kits ficam")} para conferir
          </li>
        )}
      </ul>
    </section>
  );
}
