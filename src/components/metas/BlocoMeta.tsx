"use client";

import { useState } from "react";
import { Check, Pencil, Target, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { rotuloMes } from "@/lib/domain/datas";
import { esforcoRestante, medirMeta } from "@/lib/domain/metas";
import { formatarMoeda, formatarPercentual } from "@/lib/domain/money";
import type { Centavos, CompetenciaMensal, Meta } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * A meta do mês no painel: o alvo, o quanto já entrou e o ritmo que falta.
 *
 * Segue o mesmo desenho do resultado do mês, e de propósito: um bloco com o
 * número e as contas que levam a ele, mais uma faixa rebaixada no pé com a
 * consequência. O que muda é a pergunta que ele responde — não "quanto sobrou",
 * mas "quantos doces por semana".
 */
export function BlocoMeta({
  competencia,
  meta,
  realizado,
  aoAbrir,
}: {
  competencia: CompetenciaMensal;
  /** `null` em mês sem meta: aí o bloco é um convite, e não um vazio. */
  meta: Meta | null;
  /** `entradas` do mês. É a mesma verdade do agregado, não uma segunda conta. */
  realizado: Centavos;
  aoAbrir: () => void;
}) {
  // O dia é lido uma vez, na montagem: o ritmo não pode mudar no meio de um
  // desenho da tela.
  const [agora] = useState(() => new Date());
  const mes = rotuloMes(competencia);

  if (!meta) {
    return (
      <section
        aria-labelledby="meta-do-mes"
        className="rounded-lg border border-line bg-surface px-5 py-5"
      >
        <h2
          id="meta-do-mes"
          className="flex items-center gap-2 text-subheading font-semibold text-ink"
        >
          <Target
            aria-hidden
            className="size-5 text-ink-muted"
            strokeWidth={1.75}
          />
          Meta de {mes}
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-label text-ink-muted">
          Diga quanto você quer faturar no mês e o sistema devolve o número que
          dá para perseguir na segunda-feira: quantos doces por semana.
        </p>
        <Botao className="mt-4" onClick={aoAbrir}>
          Definir a meta de {mes}
        </Botao>
      </section>
    );
  }

  const medida = medirMeta(
    {
      competencia,
      faturamentoAlvo: meta.faturamentoAlvo,
      precoMedioUnitario: meta.ticketMedioReferencia,
    },
    realizado,
    agora,
  );

  const esforco = esforcoRestante(
    medida.unidadesRestantes,
    medida.unidadesPorSemanaRestante,
    medida.diasRestantes,
  );

  const mesFechado = medida.diasRestantes === 0;
  const naoComecou = medida.diaAtual === 0;

  return (
    <section
      aria-labelledby="meta-do-mes"
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface",
        // O filete dourado da embalagem marca a meta batida. É o único uso de
        // dourado em área, e não vira confete: o que motiva é o número.
        medida.batida && "filete-dourado",
      )}
    >
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="meta-do-mes"
            className="flex items-center gap-2 text-subheading font-semibold text-ink"
          >
            <Target
              aria-hidden
              className="size-5 text-ink-muted"
              strokeWidth={1.75}
            />
            Meta de {mes}
          </h2>

          <button
            type="button"
            onClick={aoAbrir}
            className="toque -mr-2 -mt-2 flex items-center gap-1.5 rounded-md px-2 text-label font-medium text-wine-700 transition-colors duration-150 ease-quart hover:bg-wine-100 dark:text-wine-300"
          >
            <Pencil aria-hidden className="size-4" strokeWidth={1.75} />
            Editar
          </button>
        </div>

        <p className="num mt-3 flex flex-wrap items-baseline gap-x-2 text-body text-ink-muted">
          <span className="text-heading font-semibold text-ink">
            {formatarMoeda(medida.realizado)}
          </span>
          de {formatarMoeda(medida.faturamentoAlvo)}
          <span className="ml-auto font-semibold text-ink">
            {formatarPercentual(medida.progresso, 0)}
          </span>
        </p>

        <Barra progresso={medida.progresso} batida={medida.batida} />

        <Ritmo
          batida={medida.batida}
          mesFechado={mesFechado}
          naoComecou={naoComecou}
          noRitmo={medida.noRitmo}
          diasRestantes={medida.diasRestantes}
        />
      </div>

      <div className="border-t border-line bg-sunken px-5 py-4">
        {medida.batida ? (
          <p className="max-w-[52ch] text-label text-ink">
            {medida.realizado > medida.faturamentoAlvo ? (
              <>
                Você passou o alvo em{" "}
                <strong className="num font-semibold">
                  {formatarMoeda(medida.realizado - medida.faturamentoAlvo)}
                </strong>
                . Tudo que entrar até o fim do mês vem por cima.
              </>
            ) : (
              <>
                Você fechou exatamente o alvo de{" "}
                <strong className="num font-semibold">
                  {formatarMoeda(medida.faturamentoAlvo)}
                </strong>
                .
              </>
            )}
          </p>
        ) : medida.motivo === "SEM_PRECO_MEDIO" ? (
          <p className="max-w-[52ch] text-label text-ink-muted">
            Falta o preço médio de um doce para transformar o alvo em
            quantidade. Toque em editar e informe por quanto sai um doce, em
            média.
          </p>
        ) : mesFechado ? (
          <p className="max-w-[52ch] text-label text-ink-muted">
            O mês fechou com{" "}
            <strong className="num font-semibold text-ink">
              {formatarMoeda(medida.faltaEmDinheiro)}
            </strong>{" "}
            faltando para o alvo, o equivalente a{" "}
            <strong className="num font-semibold text-ink">
              {medida.unidadesRestantes}
            </strong>{" "}
            doces.
          </p>
        ) : (
          <>
            <p className="num font-display text-display font-semibold text-ink">
              {esforco.unidades}
              <span className="ml-2 font-sans text-body font-medium text-ink-muted">
                {esforco.prazo === "SEMANA"
                  ? "doces por semana"
                  : "doces até o fim do mês"}
              </span>
            </p>
            <p className="mt-1 max-w-[52ch] text-label text-ink-muted">
              É o que falta para fechar{" "}
              <strong className="num font-semibold text-ink">
                {formatarMoeda(medida.faturamentoAlvo)}
              </strong>
              , pelo preço médio de{" "}
              <strong className="num font-semibold text-ink">
                {formatarMoeda(meta.ticketMedioReferencia)}
              </strong>{" "}
              por doce.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * O progresso em barra, limitado a 100% na largura e não no número: passar da
 * meta é informação, e uma barra que estoura o trilho seria ruído.
 */
function Barra({ progresso, batida }: { progresso: number; batida: boolean }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progresso)}
      aria-valuetext={`${formatarPercentual(progresso, 0)} da meta`}
      className="mt-2 h-2 overflow-hidden rounded-full bg-sunken"
    >
      <div
        style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
        className={cn(
          "h-full rounded-full transition-[width] duration-260 ease-quart",
          batida ? "bg-gold-500" : "bg-wine-700 dark:bg-wine-300",
        )}
      />
    </div>
  );
}

/**
 * A frase de ritmo. Nunca só cor: o vinho da marca e o vermelho de erro são
 * vizinhos de matiz, então estar atrás do ritmo carrega ícone e palavra.
 */
function Ritmo({
  batida,
  mesFechado,
  naoComecou,
  noRitmo,
  diasRestantes,
}: {
  batida: boolean;
  mesFechado: boolean;
  naoComecou: boolean;
  noRitmo: boolean;
  diasRestantes: number;
}) {
  if (batida) {
    return (
      <p className="mt-3 flex items-center gap-2 text-label font-medium text-gold-600 dark:text-gold-500">
        <Check aria-hidden className="size-4 shrink-0" strokeWidth={2.25} />
        Meta batida
      </p>
    );
  }

  if (naoComecou) {
    return (
      <p className="mt-3 text-label text-ink-muted">
        Este mês ainda não começou. A meta já está de pé para quando ele chegar.
      </p>
    );
  }

  if (mesFechado) {
    return (
      <p className="mt-3 flex items-center gap-2 text-label text-ink-muted">
        <TriangleAlert
          aria-hidden
          className="size-4 shrink-0 text-ink-subtle"
          strokeWidth={1.75}
        />
        O mês fechou abaixo da meta.
      </p>
    );
  }

  return (
    <p
      className={cn(
        "mt-3 flex items-center gap-2 text-label",
        noRitmo ? "text-ink-muted" : "text-ink",
      )}
    >
      {noRitmo ? (
        <Check
          aria-hidden
          className="size-4 shrink-0 text-positive"
          strokeWidth={2.25}
        />
      ) : (
        <TriangleAlert
          aria-hidden
          className="size-4 shrink-0 text-attention"
          strokeWidth={1.75}
        />
      )}
      <span>
        {noRitmo ? "No ritmo do mês." : "Abaixo do ritmo do mês."}{" "}
        <span className="num">{diasRestantes}</span>
        {diasRestantes === 1 ? " dia restante" : " dias restantes"}.
      </span>
    </p>
  );
}
