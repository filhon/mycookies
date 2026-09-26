"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Dinheiro } from "@/components/ui/Dinheiro";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { diaEmQueBateu } from "@/lib/domain/avisos";
import { entradasAteODia, parcelasDoResumo } from "@/lib/domain/caixa";
import {
  competenciaAtual,
  competenciaVizinha,
  rotuloMes,
} from "@/lib/domain/datas";
import { esforcoRestante, ritmoDoEspelho } from "@/lib/domain/metas";
import { formatarMoeda } from "@/lib/domain/money";
import { docResumoMensal } from "@/lib/firebase/colecoes";
import { useDocumento } from "@/lib/hooks/useColecao";
import type { CompetenciaMensal, ResumoMensal } from "@/lib/types";
import { useContaId } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

/** Abaixo disto, "a mais" e "a menos" são arredondamento: é igual (`#d211`). */
const DIFERENCA_QUE_CONTA = 100;

/**
 * O mês na tela que abre de manhã (spec 045, `DECISOES.md#d210`).
 *
 * O "sobrou" é o `lucro` de `parcelasDoResumo`, o mesmo número do
 * `ResultadoDoMes` em `/financeiro`, e a meta mora dentro do bloco, porque ela
 * é uma pergunta sobre o mesmo dinheiro. O mês anterior é uma segunda leitura
 * que não segura o bloco: a comparação aparece quando chega.
 */
export function CartaoDoMes() {
  const contaId = useContaId();
  const [agora] = useState(() => new Date());
  const [competencia] = useState(() => competenciaAtual(agora));

  const refAtual = useMemo(
    () => docResumoMensal(contaId, competencia),
    [contaId, competencia],
  );
  const refAnterior = useMemo(
    () => docResumoMensal(contaId, competenciaVizinha(competencia, -1)),
    [contaId, competencia],
  );
  const atual = useDocumento<ResumoMensal>(refAtual);
  const anterior = useDocumento<ResumoMensal>(refAnterior);

  if (atual.carregando) {
    return <Esqueleto className="h-44 rounded-lg" />;
  }

  const mes = rotuloMes(competencia);
  const { entradas, saidas, custoTaxasPagamento, lucro, porDia } =
    parcelasDoResumo(atual.dado);

  // Um R$ 0,00 em display é o número mais triste do produto: uma linha basta.
  if (entradas === 0 && saidas === 0) {
    return (
      <Cartao>
        <p className="flex items-center gap-2 text-body text-ink-muted">
          <span>
            Nada entrou em {mes} ainda. A encomenda paga entra aqui sozinha.
          </span>
          <Seta />
        </p>
      </Cartao>
    );
  }

  const noPrejuizo = lucro < 0;

  return (
    <Cartao>
      <span className="flex items-center gap-2 text-label font-medium text-ink-muted">
        {mes.charAt(0).toUpperCase() + mes.slice(1)} até hoje
        <Seta />
      </span>

      <p
        className={cn(
          "mt-1 flex gap-2",
          noPrejuizo ? "items-center" : "items-baseline",
        )}
      >
        {noPrejuizo ? (
          <>
            <Dinheiro centavos={lucro} tamanho="xl" comSinal />
            <TrendingDown
              aria-hidden
              className="size-5 shrink-0 text-negative"
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <Dinheiro centavos={lucro} tamanho="xl" className="text-ink" />
            {/* O ponto marca o número que decide; prejuízo não se enfeita. */}
            <span
              aria-hidden
              className="inline-block size-2.5 shrink-0 rounded-full bg-accent-500"
            />
          </>
        )}
      </p>
      <p className="text-label font-medium text-ink">
        {noPrejuizo ? "faltou no mês" : "sobrou pra você"}
      </p>

      {/* A maquininha entra no que saiu, como no e-mail do mês (`#d209`):
          assim entrou menos saiu fecha com o número de cima. */}
      <p className="num mt-2 text-label text-ink-muted">
        Entrou {formatarMoeda(entradas)} · Saiu{" "}
        {formatarMoeda(saidas + custoTaxasPagamento)}
      </p>

      {anterior.dado && (
        <Comparacao
          diferenca={
            entradasAteODia(porDia, agora.getDate()) -
            entradasAteODia(anterior.dado.porDia ?? {}, agora.getDate())
          }
          mesAnterior={rotuloMes(competenciaVizinha(competencia, -1))}
          dia={agora.getDate()}
        />
      )}

      <Meta
        espelho={atual.dado?.meta}
        porDia={porDia}
        competencia={competencia}
        agora={agora}
        mes={mes}
      />
    </Cartao>
  );
}

/**
 * Seta e palavra, nunca vermelho: vender menos que o mês passado até aqui não
 * é erro, e o alarme não é a voz da marca (`#d211`).
 */
function Comparacao({
  diferenca,
  mesAnterior,
  dia,
}: {
  diferenca: number;
  mesAnterior: string;
  dia: number;
}) {
  const ate = `até o dia ${dia}`;

  if (Math.abs(diferenca) < DIFERENCA_QUE_CONTA) {
    return (
      <p className="mt-1 text-label text-ink-muted">
        Entrou igual a {mesAnterior} {ate}
      </p>
    );
  }

  const aMais = diferenca > 0;
  const Icone = aMais ? TrendingUp : TrendingDown;

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1.5 text-label",
        aMais ? "text-positive" : "text-ink-muted",
      )}
    >
      <Icone aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      <span>
        Entrou <span className="num">{formatarMoeda(Math.abs(diferenca))}</span>{" "}
        {aMais ? "a mais" : "a menos"} que {mesAnterior} {ate}
      </span>
    </p>
  );
}

/**
 * A meta em barra, com o dinheiro antes dos doces: "faltam R$ 114" é o pico do
 * mês, e "uns 12 doces" é o que decide o forno.
 */
function Meta({
  espelho,
  porDia,
  competencia,
  agora,
  mes,
}: {
  espelho: ResumoMensal["meta"];
  porDia: ResumoMensal["porDia"];
  competencia: CompetenciaMensal;
  agora: Date;
  mes: string;
}) {
  if (!espelho) {
    return (
      <p className="mt-4 text-label font-medium text-brand-ink">
        Pôr uma meta para {mes}
      </p>
    );
  }

  const ritmo = ritmoDoEspelho(espelho, competencia, agora);
  const falta = espelho.faturamentoAlvo - espelho.realizado;

  let frase: React.ReactNode;
  if (ritmo.batida) {
    const dia = diaEmQueBateu(porDia, espelho.faturamentoAlvo);
    frase = (
      <span className="flex items-center gap-1.5 font-medium text-positive">
        <Check aria-hidden className="size-4 shrink-0" strokeWidth={2.25} />
        {dia ? `Meta batida no dia ${dia}` : "Meta batida"}
      </span>
    );
  } else {
    const esforco = esforcoRestante(
      espelho.unidadesRestantes,
      ritmo.unidadesPorSemanaRestante,
      ritmo.diasRestantes,
    );
    frase = (
      <span className="text-ink-muted">
        Faltam{" "}
        <span className="num font-semibold text-ink">
          {formatarMoeda(falta)}
        </span>
        , uns <span className="num">{esforco.unidades}</span>{" "}
        {esforco.prazo === "SEMANA"
          ? "doces por semana."
          : "doces até o fim do mês."}
      </span>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(espelho.progresso)}
          aria-label="Meta do mês"
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-sunken"
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, espelho.progresso))}%`,
            }}
            className={cn(
              "h-full rounded-full transition-[width] duration-260 ease-quart",
              ritmo.batida ? "bg-positive" : "bg-brand-ink",
            )}
          />
        </div>
        <span className="num shrink-0 text-label text-ink-muted">
          {formatarMoeda(espelho.realizado)} de{" "}
          {formatarMoeda(espelho.faturamentoAlvo)}
        </span>
      </div>
      <p className="mt-1.5 text-label">{frase}</p>
    </div>
  );
}

/**
 * O bloco inteiro é o alvo de toque: um cartão com um link dentro faria a
 * usuária mirar em uma palavra, em pé e com uma mão só.
 */
function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/financeiro"
      className="group block rounded-lg border border-line bg-surface px-5 py-5 transition-colors duration-150 ease-quart hover:bg-sunken active:bg-sunken"
    >
      {children}
    </Link>
  );
}

function Seta() {
  return (
    <ChevronRight
      aria-hidden
      className="ml-auto size-4 shrink-0 text-ink-subtle"
      strokeWidth={1.75}
    />
  );
}
